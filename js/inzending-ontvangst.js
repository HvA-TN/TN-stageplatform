window.inzendingOntvangst = (() => {
  const api = (window.siteInstellingen?.inzendingenApi || '').replace(/\/$/, '');
  let widget, attempt;
  const enabled = window.siteInstellingen?.cloudflareActief === true && window.siteInstellingen?.opdrachtIndienen === true;
  const holder = document.getElementById('inzendingSpamcontrole');
  if (enabled && holder) {
    holder.hidden = false;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      if (!window.siteInstellingen.turnstileSitekey) return;
      widget = turnstile.render(holder, { sitekey: window.siteInstellingen.turnstileSitekey, action: 'submission' });
    };
    document.head.appendChild(script);
  }
  async function bewaar(data, signal) {
    if (!enabled) return;
    if (!api || !window.siteInstellingen.turnstileSitekey) throw new Error('Cloudflare is nog niet ingesteld.');
    const fields = ['titel', 'organisatie', 'locatie', 'type', 'periode', 'message', 'name', 'email', 'telefoon', 'documentlink'];
    const body = Object.fromEntries(fields.map(key => [key, String(data.get(key) || '').trim()]));
    body.direct = String(data.get('email_delen')).startsWith('Opdracht en contactgegevens rechtstreeks');
    const files = data.getAll('document').filter(file => file?.size);
    if (files.length > 2) throw new Error('Maximaal 2 bestanden.');
    if (files.length) body.documents = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(file.name)) throw new Error('PDF of Word, maximaal 5 MB per bestand.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 32768) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      }
      body.documents.push({ name: file.name, content: btoa(binary) });
    }
    const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(JSON.stringify(body)))), byte => byte.toString(16).padStart(2, '0')).join('');
    if (!attempt || attempt.fingerprint !== fingerprint) attempt = { fingerprint, id: crypto.randomUUID(), stored: false };
    if (attempt.stored) return;
    const token = widget === undefined ? '' : window.turnstile?.getResponse(widget);
    if (!token) throw new Error(document.documentElement.lang === 'en'
      ? 'Complete the spam check. If it is missing, reload the page and check whether your browser blocks it.'
      : 'Voltooi de spamcontrole. Zie je die niet, herlaad de pagina en controleer of je browser deze blokkeert.');
    try {
      const response = await fetch(`${api}/submissions`, { method: 'POST', signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: attempt.id, token }) });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        if (result.code === 'storage_full') throw new Error(document.documentElement.lang === 'en'
          ? 'Storage is full. New projects cannot be submitted at the moment. Please try again later or contact the coordinator.'
          : 'De opslag is vol. Er kunnen tijdelijk geen nieuwe opdrachten worden ingediend. Probeer later opnieuw of neem contact op met de coördinator.');
        if (result.code === 'storage_not_ready') throw new Error(document.documentElement.lang === 'en'
          ? 'Submissions are temporarily unavailable while storage is being configured.'
          : 'Inzenden is tijdelijk niet beschikbaar terwijl de opslagcontrole wordt ingesteld.');
        throw new Error(typeof result.error === 'string' ? result.error.slice(0, 300) : `HTTP ${response.status}`);
      }
      attempt.stored = true;
    } finally { window.turnstile?.reset(widget); }
  }
  function reset() { attempt = null; if (widget !== undefined) window.turnstile?.reset(widget); }
  return { enabled, bewaar, reset, id: () => attempt?.id || '', opgeslagen: () => Boolean(attempt?.stored) };
})();
