// Deploy as a module Worker. Secrets belong in Cloudflare, never in this file.
const encoder = new TextEncoder();
const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

async function authorised(request, env) {
  if (!env.REVIEW_TOKEN || env.REVIEW_TOKEN.length < 8 || env.REVIEW_TOKEN.length > 33) return false;
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 1024) return false;
  const [actual, expected] = await Promise.all([digest(header.slice(7)), digest(env.REVIEW_TOKEN)]);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

async function readJson(request, limit = 40000) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('Gebruik JSON.');
  if (!request.body || Number(request.headers.get('Content-Length') || 0) > limit) throw new Error('Ongeldige omvang.');
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new Error('Inzending te groot.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function submission(input) {
  const text = (key, max, required = false) => {
    const value = input[key];
    if (value !== undefined && typeof value !== 'string') throw new Error(`Ongeldig veld: ${key}`);
    const result = (value || '').trim();
    if (result.length > max || (required && !result)) throw new Error(`Controleer ${key}.`);
    return result;
  };
  const id = text('id', 36, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error('Ongeldige inzending-ID.');
  const type = text('type', 30, true);
  if (!['Stage', 'Afstuderen', 'Stage/Afstuderen'].includes(type)) throw new Error('Ongeldig type opdracht.');
  const email = text('email', 254, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ongeldig e-mailadres.');
  const documentlink = text('documentlink', 2000);
  if (documentlink && !['http:', 'https:'].includes(new URL(documentlink).protocol)) throw new Error('Ongeldige documentlink.');
  if (typeof input.direct !== 'boolean') throw new Error('Kies hoe contactgegevens gedeeld mogen worden.');
  const project = {
    titel: text('titel', 200, true), bedrijf: text('organisatie', 200, true),
    locatie: text('locatie', 200, true), type, periode: text('periode', 150) || 'In overleg',
    domein: [], keywords: [], beschrijving: text('message', 10000), contact: '', docent: '',
    status: 'closed'
  };
  const contact = { naam: text('name', 150, true), email, telefoon: text('telefoon', 50), documentlink,
    delen: input.direct ? 'Rechtstreeks, zonder voorselectie' : 'Na voorselectie door docent' };
  return { id, project, contact };
}

const documentLimit = 5 * 1024 * 1024;
async function readDocument(value) {
  if (!value) return null;
  if (typeof value.name !== 'string' || !/\.(pdf|doc|docx)$/i.test(value.name) || value.name.length > 200 ||
      typeof value.content !== 'string' || value.content.length > Math.ceil(documentLimit / 3) * 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(value.content)) throw new Error('Gebruik PDF of Word, maximaal 5 MB per bestand.');
  const data = Uint8Array.from(atob(value.content), c => c.charCodeAt(0));
  const extension = value.name.split('.').pop().toLowerCase();
  const signature = Array.from(data.slice(0, 8));
  const valid = extension === 'pdf' ? new TextDecoder().decode(data.slice(0, 5)) === '%PDF-'
    : extension === 'doc' ? signature.join(',') === '208,207,17,224,161,177,26,225'
    : signature.slice(0, 4).join(',') === '80,75,3,4';
  if (!data.length || data.length > documentLimit || !valid) {
    throw new Error('Ongeldig document of groter dan 5 MB.');
  }
  const type = { pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }[extension];
  const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
  const name = value.name.replace(/[\x00-\x1f\x7f/\\]/g, '_');
  return { data, hash, name, extension, type, size: data.length };
}

const storageLimit = 8000000000; // Decimal GB: 2 GB margin below 10 GB.
async function storageStatus(env) {
  const quota = await env.DB.prepare('SELECT used_bytes, ready, cursor FROM storage_quota WHERE id = 1').first();
  if (!quota) throw new Error('STORAGE_NOT_READY');
  return { used: quota.used_bytes, limit: storageLimit, ready: quota.ready === 1, cursor: quota.cursor };
}
async function initializeStorage(env) {
  const status = await storageStatus(env);
  if (status.ready) return status;
  if (!env.DOCUMENTS) throw new Error('STORAGE_NOT_READY');
  const page = await env.DOCUMENTS.list({ limit: 500, ...(status.cursor ? { cursor: status.cursor } : {}) });
  const files = page.objects.map(object => ({ key: object.key, size: object.size }));
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO storage_files(object_key, bytes) SELECT json_extract(value, '$.key'), json_extract(value, '$.size') FROM json_each(?)")
      .bind(JSON.stringify(files)),
    env.DB.prepare('UPDATE storage_quota SET ready = ?, cursor = ? WHERE id = 1 AND ready = 0 AND cursor IS ?')
      .bind(page.truncated ? 0 : 1, page.truncated ? page.cursor : null, status.cursor)
  ]);
  return storageStatus(env);
}
async function reserveStorage(env, id, fingerprint, files) {
  // D1 batch is atomic: capacity, identity and both files succeed together or not at all.
  // Failed uploads retain their reservations, so uncertain R2 writes never undercount.
  await env.DB.batch([
    env.DB.prepare('INSERT INTO storage_receipts(id, fingerprint) VALUES (?, ?) ON CONFLICT(id) DO NOTHING')
      .bind(id, fingerprint),
    env.DB.prepare("INSERT OR IGNORE INTO storage_files(object_key, bytes) SELECT json_extract(value, '$.key'), json_extract(value, '$.size') FROM json_each(?)")
      .bind(JSON.stringify(files))
  ]);
}

function expiresAt(archivedAt) {
  const date = new Date(archivedAt);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 6);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date;
}

async function cleanArchived(env, now = new Date()) {
  // Daily bounded batch; retain metadata until all R2 deletes have succeeded.
  if (!(await storageStatus(env)).ready) return; // Finish the initial inventory before changing the bucket.
  const cutoff = new Date(now.getTime() - 180 * 86400000).toISOString();
  const { results } = await env.DB.prepare("SELECT id, archived_at, cleanup_started_at, contact_json FROM submissions WHERE state = 'archived' AND (archived_at <= ? OR cleanup_started_at IS NOT NULL) ORDER BY archived_at, id LIMIT 5").bind(cutoff).all();
  let failed = false;
  for (const row of results) {
    if (!row.cleanup_started_at && !(expiresAt(row.archived_at) <= now)) continue;
    try {
      if (!row.cleanup_started_at) {
        const claimed = await env.DB.prepare("UPDATE submissions SET cleanup_started_at = ? WHERE id = ? AND state = 'archived' AND archived_at = ? AND cleanup_started_at IS NULL")
          .bind(now.toISOString(), row.id, row.archived_at).run();
        if (!claimed.meta.changes) continue; // Reopened or claimed by another run.
      }
      const contact = JSON.parse(row.contact_json);
      const files = contact.documents || (contact.document ? [contact.document] : []);
      for (const file of files) {
        if (!env.DOCUMENTS || typeof file.key !== 'string' || !file.key.startsWith(`submissions/${row.id}/`)) {
          throw new Error('Document storage unavailable or invalid key');
        }
        await env.DOCUMENTS.delete(file.key);
        await env.DB.prepare('DELETE FROM storage_files WHERE object_key = ?').bind(file.key).run();
      }
      await env.DB.batch([
        env.DB.prepare("DELETE FROM submissions WHERE id = ? AND state = 'archived' AND cleanup_started_at IS NOT NULL").bind(row.id),
        env.DB.prepare('DELETE FROM storage_receipts WHERE id = ?').bind(row.id)
      ]);
    } catch (_) { failed = true; }
  }
  if (failed) throw new Error('Some expired submissions could not be removed; retry on the next scheduled run.');
}

export default {
  async scheduled(event, env) {
    await cleanArchived(env, new Date(event.scheduledTime));
  },
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
    if (origin && origin === env.SITE_ORIGIN) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS';
    }
    const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
    if (!env.SITE_ORIGIN || !env.DB) return reply({ error: 'Backend nog niet ingesteld.' }, 503);
    if (origin && origin !== env.SITE_ORIGIN) return reply({ error: 'Niet toegestaan.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const path = new URL(request.url).pathname;
    try {
      if (request.method === 'POST' && path === '/submissions') {
        if (!env.TURNSTILE_SECRET) return reply({ error: 'Spamcontrole ontbreekt.' }, 503);
        let input, parsed, documents;
        try {
          input = await readJson(request, 14200000);
          if (input.document && input.documents !== undefined) throw new Error('Gebruik één documentformaat.');
          const uploads = input.documents ?? (input.document ? [input.document] : []);
          if (!Array.isArray(uploads) || uploads.length > 2 || uploads.some(value => !value)) throw new Error('Maximaal twee bestanden.');
          documents = [];
          for (const upload of uploads) documents.push(await readDocument(upload));
          parsed = submission(input);
        }
        catch (_) { return reply({ error: 'Controleer de opdrachtgegevens en documenten (maximaal 2 PDF- of Word-bestanden, elk maximaal 5 MB).' }, 400); }
        if (typeof input.token !== 'string' || input.token.length > 2048 || !input.token) return reply({ error: 'Voltooi de spamcontrole.' }, 400);
        const validation = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: input.token,
            remoteip: request.headers.get('CF-Connecting-IP') || '' }), signal: AbortSignal.timeout(10000)
        });
        const verified = await validation.json();
        if (!verified.success || verified.hostname !== new URL(env.SITE_ORIGIN).hostname || verified.action !== 'submission') {
          return reply({ error: 'Spamcontrole mislukt. Probeer opnieuw.' }, 400);
        }
        if (documents.length) {
          if (!env.DOCUMENTS) return reply({ error: 'Documentopslag is nog niet gekoppeld.' }, 503);
          const metadata = documents.map(document => ({ name: document.name, size: document.size,
            type: document.type, key: `submissions/${parsed.id}/${document.hash}.${document.extension}` }));
          // Preserve the original single-PDF format for retries from older clients.
          if (input.document && !input.documents) {
            parsed.contact.document = { name: metadata[0].name, size: metadata[0].size, key: metadata[0].key };
          } else parsed.contact.documents = metadata;
        }
        const fingerprint = hex(await digest(JSON.stringify(parsed)));
        const existing = await env.DB.prepare('SELECT payload_hash FROM submissions WHERE id = ?').bind(parsed.id).first();
        if (existing) return existing.payload_hash === fingerprint
          ? reply({ success: true, id: parsed.id }, 200)
          : reply({ error: 'Inzending gewijzigd. Start een nieuwe inzending.' }, 409);
        await reserveStorage(env, parsed.id, fingerprint,
          parsed.contact.documents || (parsed.contact.document ? [parsed.contact.document] : []));
        for (let i = 0; i < documents.length; i++) {
          const metadata = parsed.contact.documents?.[i] || parsed.contact.document;
          await env.DOCUMENTS.put(metadata.key, documents[i].data, {
            httpMetadata: { contentType: documents[i].type }
          });
        }
        const now = new Date().toISOString();
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
        const part = type => parts.find(item => item.type === type).value;
        parsed.project.uploaddatum = `${part('year')}-${part('month')}-${part('day')}`;
        await env.DB.prepare('INSERT INTO submissions (id, created_at, payload_hash, project_json, contact_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
          .bind(parsed.id, now, fingerprint, JSON.stringify(parsed.project), JSON.stringify(parsed.contact)).run();
        const saved = await env.DB.prepare('SELECT payload_hash FROM submissions WHERE id = ?').bind(parsed.id).first();
        if (!saved || saved.payload_hash !== fingerprint) return reply({ error: 'Inzending gewijzigd. Start een nieuwe inzending.' }, 409);
        return reply({ success: true, id: parsed.id }, 201);
      }
      if (path === '/submissions' || path.startsWith('/submissions/')) {
        if (!env.REVIEW_TOKEN || env.REVIEW_TOKEN.length < 8 || env.REVIEW_TOKEN.length > 33) {
          return reply({ error: 'Inbox niet goed ingesteld. Controleer de secret REVIEW_TOKEN (hoofdletters, 8 tot en met 33 tekens) en deploy de Worker opnieuw.' }, 503);
        }
        if (!await authorised(request, env)) return reply({ error: 'Geen toegang tot inzendingen.' }, 401);
        if (request.method === 'POST' && path === '/submissions/storage/initialize') {
          const storage = await initializeStorage(env);
          return reply({ storage: { used: storage.used, limit: storage.limit, ready: storage.ready } });
        }
        const documentRoute = /^\/submissions\/([0-9a-f-]{36})\/document(?:\/([01]))?$/i.exec(path);
        if (request.method === 'GET' && documentRoute) {
          const row = await env.DB.prepare('SELECT contact_json FROM submissions WHERE id = ?').bind(documentRoute[1]).first();
          const contact = row && JSON.parse(row.contact_json);
          const files = contact?.documents || (contact?.document ? [contact.document] : []);
          const file = files[Number(documentRoute[2] || 0)];
          if (!file) return reply({ error: 'Geen document gevonden.' }, 404);
          if (!env.DOCUMENTS) return reply({ error: 'Documentopslag is niet gekoppeld.' }, 503);
          const object = await env.DOCUMENTS.get(file.key);
          if (!object) return reply({ error: 'Document niet gevonden.' }, 404);
          return new Response(object.body, { headers: { ...headers, 'Content-Type': file.type || 'application/pdf',
            'Content-Disposition': 'attachment',
            'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" } });
        }
        if (request.method === 'GET' && path === '/submissions') {
          const params = new URL(request.url).searchParams;
          const state = params.get('state') === 'archived' ? 'archived' : 'pending';
          const page = Math.max(0, Math.min(100000, Number(params.get('page')) || 0));
          const { results } = await env.DB.prepare('SELECT * FROM submissions WHERE state = ? ORDER BY created_at DESC, id LIMIT 51 OFFSET ?')
            .bind(state, Math.floor(page) * 50).all();
          let storage;
          try { storage = { ...await storageStatus(env), configured: true }; }
          catch (error) {
            const detail = String(error?.message || '') + String(error?.cause?.message || '');
            if (!/no such table: (storage_quota|storage_files|storage_receipts)|STORAGE_NOT_READY/.test(detail)) throw error;
            storage = { used: null, limit: storageLimit, ready: false, configured: false };
          }
          const retentionConfigured = await env.DB.prepare("SELECT COUNT(*) AS count FROM pragma_table_info('submissions') WHERE name IN ('archived_at', 'cleanup_started_at')").first();
          return reply({ retentionConfigured: retentionConfigured.count === 2, storage: { used: storage.used, limit: storage.limit, ready: storage.ready, configured: storage.configured }, items: results.slice(0, 50).map(row => ({ id: row.id, created_at: row.created_at, state: row.state, archived_at: row.archived_at, cleanup_started_at: row.cleanup_started_at,
            project: JSON.parse(row.project_json), contact: JSON.parse(row.contact_json) })), more: results.length > 50 });
        }
        if (request.method === 'PATCH' && /^\/submissions\/[0-9a-f-]{36}$/i.test(path)) {
          let input;
          try { input = await readJson(request); } catch (_) { return reply({ error: 'Ongeldige status.' }, 400); }
          if (!['pending', 'archived'].includes(input.state)) return reply({ error: 'Ongeldige status.' }, 400);
          const result = await env.DB.prepare("UPDATE submissions SET archived_at = CASE WHEN ? = 'pending' THEN NULL WHEN state = 'archived' THEN COALESCE(archived_at, ?) ELSE ? END, state = ? WHERE id = ? AND cleanup_started_at IS NULL")
            .bind(input.state, new Date().toISOString(), new Date().toISOString(), input.state, path.split('/')[2]).run();
          return result.meta.changes ? reply({ success: true }) : reply({ error: 'Inzending niet gevonden of automatische verwijdering is al gestart.' }, 409);
        }
      }
      return reply({ error: 'Niet gevonden.' }, 404);
    } catch (error) {
      const detail = String(error?.message || '') + String(error?.cause?.message || '');
      if (/no such table: storage_/.test(detail)) return reply({ code: 'storage_not_ready', error: 'Voer eerst cloudflare/migrate-storage-limit.sql uit in de D1-console. De inbox blijft beschikbaar.' }, 503);
      if (/no such column: (archived_at|cleanup_started_at)/.test(detail)) return reply({ error: 'Voer eerst cloudflare/migrate-retention.sql uit in de D1-console om de bewaartermijn in te stellen.' }, 503);
      if (detail.includes('STORAGE_FULL')) return reply({ code: 'storage_full', error: 'De opslag is vol. Er kunnen tijdelijk geen nieuwe opdrachten worden ingediend. Probeer later opnieuw of neem contact op met de coördinator.' }, 507);
      if (detail.includes('STORAGE_NOT_READY')) return reply({ code: 'storage_not_ready', error: 'Inzenden is tijdelijk niet beschikbaar. De beheerder moet de opslagcontrole eerst activeren.' }, 503);
      if (detail.includes('STORAGE_CONFLICT')) return reply({ error: 'Inzending gewijzigd. Start een nieuwe inzending.' }, 409);
      return reply({ error: 'Tijdelijk niet beschikbaar. Probeer later opnieuw.' }, 503);
    }
  }
};
