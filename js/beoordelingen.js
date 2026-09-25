(() => {
  if (window.siteInstellingen?.cloudflareActief !== true) return;
  const el = id => document.getElementById(id);
  const api = (window.siteInstellingen?.inzendingenApi || '').replace(/\/$/, '');
  const panel = el('beoordelingen');
  const list = el('beoordelingenLijst');
  const message = el('beoordelingenStatus');
  let token = '', page = 0, controller, busy = false, session = 0;
  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(api + path, { ...options, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      const local = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
      throw new Error(local
        ? 'De inbox is niet toegankelijk vanaf dit lokale adres. Open opdrachtenbeheer op https://hva-tn.github.io/TN-stageplatform/opdrachten-beheer.html.'
        : `Geen verbinding met de inbox. Controleer je internetverbinding en of Cloudflare SITE_ORIGIN exact ${window.location.origin} toestaat.`);
    }
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || 'Laden mislukt.');
    return value;
  }
  async function load() {
    if (busy) return;
    busy = true;
    const generation = session;
    list.replaceChildren();
    message.textContent = 'Inzendingen laden...';
    try {
      const state = el('beoordelingenFilter').value;
      const result = await request(`/submissions?state=${state}&page=${page}`);
      if (generation !== session) return;
      for (const item of result.items) {
        const card = document.createElement('article');
        card.className = 'assignment-admin-block';
        const title = document.createElement('h3');
        title.textContent = `${item.project.bedrijf} — ${item.project.titel}`;
        const details = document.createElement('p');
        details.textContent = `${new Date(item.created_at).toLocaleDateString('nl-NL')} · ${item.project.locatie} · ${item.project.type}`;
        const description = document.createElement('p');
        description.textContent = item.project.beschrijving;
        const contact = document.createElement('p');
        contact.textContent = `Contact: ${item.contact.naam} · ${item.contact.email}${item.contact.telefoon ? ' · ' + item.contact.telefoon : ''}. Voorkeur: ${item.contact.delen}.${item.contact.documentlink ? ' Document: ' + item.contact.documentlink : ''}`;
        const actions = document.createElement('div');
        actions.className = 'opdracht-index-actions';
        const transfer = document.createElement('button');
        transfer.type = 'button'; transfer.className = 'search-reset-button'; transfer.textContent = 'Overnemen om te bewerken';
        transfer.addEventListener('click', () => {
          const detail = { project: item.project, submissionId: item.id, accepted: false };
          document.dispatchEvent(new CustomEvent('beoordelingovernemen', { detail }));
          if (detail.accepted) {
            transfer.disabled = true;
            message.textContent = 'Overgenomen als gesloten opdracht. Bewerk, sla op en publiceer. Markeer de inzending daarna als afgehandeld.';
          }
        });
        const archive = document.createElement('button');
        archive.type = 'button'; archive.className = 'search-reset-button';
        archive.textContent = state === 'pending' ? 'Als afgehandeld markeren' : 'Terug naar te beoordelen';
        archive.addEventListener('click', async () => {
          if (busy || !window.confirm('Status van deze inzending wijzigen? Dit publiceert geen opdracht.')) return;
          archive.disabled = true;
          try {
            await request(`/submissions/${item.id}`, { method: 'PATCH', body: JSON.stringify({ state: state === 'pending' ? 'archived' : 'pending' }) });
            await load();
          } catch (error) { message.textContent = error.message; archive.disabled = false; }
        });
        actions.append(transfer, archive); card.append(title, details, description, contact, actions); list.appendChild(card);
      }
      el('beoordelingenVorige').disabled = page === 0;
      el('beoordelingenVolgende').disabled = !result.more;
      message.textContent = result.items.length ? `${result.items.length} inzendingen op pagina ${page + 1}.` : 'Geen inzendingen in deze lijst.';
      el('beoordelingenInhoud').hidden = false;
    } catch (error) { if (generation === session && error.name !== 'AbortError') message.textContent = error.message; }
    finally { busy = false; }
  }
  el('beoordelingenOpenen').addEventListener('click', () => {
    if (busy) return;
    const input = el('beoordelingenToken');
    if (!input.value) { input.focus(); return; }
    token = input.value.trim(); input.value = '';
    controller?.abort(); controller = new AbortController(); page = 0; load();
  });
  el('beoordelingenVerversen').addEventListener('click', load);
  el('beoordelingenFilter').addEventListener('change', () => { if (!busy) { page = 0; load(); } });
  el('beoordelingenVorige').addEventListener('click', () => { if (!busy && page > 0) { page--; load(); } });
  el('beoordelingenVolgende').addEventListener('click', () => { if (!busy) { page++; load(); } });
  document.addEventListener('beheerlogin', () => { panel.hidden = !api; });
  document.addEventListener('beheerlogout', () => {
    session++;
    controller?.abort(); token = ''; page = 0; list.replaceChildren();
    panel.hidden = true; el('beoordelingenInhoud').hidden = true;
    el('beoordelingenToken').value = ''; message.textContent = '';
  });
})();
