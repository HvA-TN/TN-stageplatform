// Deploy as a module Worker. Secrets belong in Cloudflare, never in this file.
const encoder = new TextEncoder();
const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

async function authorised(request, env) {
  if (!env.REVIEW_TOKEN || env.REVIEW_TOKEN.length < 8) return false;
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 1024) return false;
  const [actual, expected] = await Promise.all([digest(header.slice(7)), digest(env.REVIEW_TOKEN)]);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

async function readJson(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('Gebruik JSON.');
  if (!request.body || Number(request.headers.get('Content-Length') || 0) > 40000) throw new Error('Ongeldige omvang.');
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 40000) { await reader.cancel(); throw new Error('Inzending te groot.'); }
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
    domein: [], keywords: [], beschrijving: text('message', 10000, true), contact: '', docent: '',
    status: 'closed'
  };
  const contact = { naam: text('name', 150, true), email, telefoon: text('telefoon', 50), documentlink,
    delen: input.direct ? 'Rechtstreeks, zonder voorselectie' : 'Na voorselectie door docent' };
  return { id, project, contact };
}

export default {
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
        let input, parsed;
        try { input = await readJson(request); parsed = submission(input); }
        catch (_) { return reply({ error: 'Controleer de ingevulde opdrachtgegevens.' }, 400); }
        if (typeof input.token !== 'string' || input.token.length > 2048 || !input.token) return reply({ error: 'Voltooi de spamcontrole.' }, 400);
        const validation = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: input.token,
            remoteip: request.headers.get('CF-Connecting-IP') || '' }), signal: AbortSignal.timeout(10000)
        });
        const verified = await validation.json();
        if (!verified.success || verified.hostname !== new URL(env.SITE_ORIGIN).hostname || verified.action !== 'submission') {
          return reply({ error: 'Spamcontrole mislukt. Probeer opnieuw.' }, 400);
        }
        const fingerprint = hex(await digest(JSON.stringify(parsed)));
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
        if (!await authorised(request, env)) return reply({ error: 'Geen toegang tot inzendingen.' }, 401);
        if (request.method === 'GET' && path === '/submissions') {
          const params = new URL(request.url).searchParams;
          const state = params.get('state') === 'archived' ? 'archived' : 'pending';
          const page = Math.max(0, Math.min(100000, Number(params.get('page')) || 0));
          const { results } = await env.DB.prepare('SELECT id, created_at, project_json, contact_json, state FROM submissions WHERE state = ? ORDER BY created_at DESC, id LIMIT 51 OFFSET ?')
            .bind(state, Math.floor(page) * 50).all();
          return reply({ items: results.slice(0, 50).map(row => ({ id: row.id, created_at: row.created_at, state: row.state,
            project: JSON.parse(row.project_json), contact: JSON.parse(row.contact_json) })), more: results.length > 50 });
        }
        if (request.method === 'PATCH' && /^\/submissions\/[0-9a-f-]{36}$/i.test(path)) {
          let input;
          try { input = await readJson(request); } catch (_) { return reply({ error: 'Ongeldige status.' }, 400); }
          if (!['pending', 'archived'].includes(input.state)) return reply({ error: 'Ongeldige status.' }, 400);
          const result = await env.DB.prepare('UPDATE submissions SET state = ? WHERE id = ?').bind(input.state, path.split('/')[2]).run();
          return result.meta.changes ? reply({ success: true }) : reply({ error: 'Inzending niet gevonden.' }, 404);
        }
      }
      return reply({ error: 'Niet gevonden.' }, 404);
    } catch (_) {
      return reply({ error: 'Tijdelijk niet beschikbaar. Probeer later opnieuw.' }, 503);
    }
  }
};
