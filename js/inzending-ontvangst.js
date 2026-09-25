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
    const fingerprint = JSON.stringify(body);
    if (!attempt || attempt.fingerprint !== fingerprint) attempt = { fingerprint, id: crypto.randomUUID(), stored: false };
    if (attempt.stored) return;
    const token = widget === undefined ? '' : window.turnstile?.getResponse(widget);
    if (!token) throw new Error('Voltooi de spamcontrole.');
    try {
      const response = await fetch(`${api}/submissions`, { method: 'POST', signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: attempt.id, token }) });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error('Ontvangst niet bevestigd.');
      attempt.stored = true;
    } finally { window.turnstile?.reset(widget); }
  }
  function reset() { attempt = null; if (widget !== undefined) window.turnstile?.reset(widget); }
  return { enabled, bewaar, reset, opgeslagen: () => Boolean(attempt?.stored) };
})();
