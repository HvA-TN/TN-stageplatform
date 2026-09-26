(() => {
  if (window.siteInstellingen?.cloudflareActief !== true) return;
  const el = id => document.getElementById(id);
  const api = (window.siteInstellingen?.inzendingenApi || '').replace(/\/$/, '');
  const panel = el('beoordelingen');
  const list = el('beoordelingenLijst');
  const message = el('beoordelingenStatus');
  let token = '', page = 0, controller, busy = false, session = 0;
  function showStorage(storage) {
    if (!storage) return;
    const status = el('inboxOpslagStatus');
    const activate = el('inboxOpslagActiveren');
    if (!status || !activate) return;
    if (storage.configured === false) {
      status.textContent = '';
      status.hidden = true;
      activate.hidden = true;
      return;
    }
    status.hidden = false;
    const gb = value => (value / 1000000000).toLocaleString('nl-NL', { maximumFractionDigits: 3 });
    el('inboxOpslagStatus').textContent = storage.ready
      ? `Documentopslag: ${gb(storage.used)} van ${gb(storage.limit)} GB gebruikt of gereserveerd.${storage.used >= storage.limit ? ' Nieuwe inzendingen zijn geblokkeerd.' : ''}`
      : 'Activeer de opslagcontrole om bestaande bestanden mee te tellen. Tot die tijd zijn nieuwe inzendingen geblokkeerd.';
    el('inboxOpslagActiveren').hidden = storage.ready;
  }
  async function request(path, options = {}, download = false) {
    let response;
    try {
      response = await fetch(api + path, { ...options, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new Error('Geen verbinding met de inbox. Probeer het later opnieuw.');
    }
    if (download && response.ok) return response.blob();
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
      showStorage(result.storage);
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
        actions.className = 'opdracht-index-actions inbox-review-actions';
        const documents = document.createElement('section');
        documents.className = 'inbox-documents';
        const documentsTitle = document.createElement('h4');
        documentsTitle.textContent = 'Documenten';
        documents.appendChild(documentsTitle);
        const files = item.contact.documents || (item.contact.document ? [item.contact.document] : []);
        files.forEach((file, index) => {
          const download = document.createElement('button');
          download.type = 'button'; download.className = 'search-reset-button';
          const fileRow = document.createElement('div');
          fileRow.className = 'inbox-document';
          const fileName = document.createElement('span');
          fileName.textContent = file.name;
          download.textContent = 'Download document';
          download.setAttribute('aria-label', `Download ${file.name}`);
          download.addEventListener('click', async () => {
            download.disabled = true;
            const generation = session;
            try {
              const blob = await request(`/submissions/${item.id}/document/${index}`, {}, true);
              if (generation !== session) return;
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url; link.download = file.name;
              document.body.appendChild(link); link.click(); link.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (error) {
              if (generation === session && error.name !== 'AbortError') message.textContent = error.message;
            } finally { download.disabled = false; }
          });
          fileRow.append(download, fileName);
          documents.appendChild(fileRow);
        });
        const transfer = document.createElement('button');
        transfer.disabled = Boolean(item.cleanup_started_at);
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
        archive.disabled = Boolean(item.cleanup_started_at) || result.retentionConfigured === false;
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
        actions.append(transfer, archive);
        card.append(title, details, description, contact);
        if (files.length) card.appendChild(documents);
        card.appendChild(actions); list.appendChild(card);
      }
      el('beoordelingenVorige').disabled = page === 0;
      el('beoordelingenVolgende').disabled = !result.more;
      message.textContent = result.items.length ? `${result.items.length} inzendingen op pagina ${page + 1}.` : 'Geen inzendingen in deze lijst.';
      el('beoordelingenInhoud').hidden = false;
    } catch (error) { if (generation === session && error.name !== 'AbortError') message.textContent = error.message; }
    finally { busy = false; }
  }
  el('inboxOpslagActiveren')?.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    const generation = session;
    const button = el('inboxOpslagActiveren');
    button.disabled = true;
    let complete = false;
    try {
      do {
        const result = await request('/submissions/storage/initialize', { method: 'POST' });
        if (generation !== session) return;
        complete = result.storage.ready;
        showStorage(result.storage);
        message.textContent = complete ? 'Opslagcontrole actief.' : 'Bestaande documenten tellen...';
      } while (!complete);
    } catch (error) {
      if (generation === session && error.name !== 'AbortError') message.textContent = error.message;
    } finally { busy = false; button.disabled = false; }
    if (complete && generation === session) await load();
  });
  el('beoordelingenOpenen').addEventListener('click', () => {
    if (busy) return;
    const input = el('beoordelingenToken');
    if (input.value.length < 8 || input.value.length > 33) {
      message.textContent = 'Vul een inboxcode van 8 tot en met 33 tekens in.';
      input.focus(); return;
    }
    token = input.value; input.value = '';
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
