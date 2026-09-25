(() => {
  const el = id => document.getElementById(id);
  const open = el('beheerOpen'), form = el('beheerOpslaan'), editor = el('beheerJson');
  const index = el('opdrachtIndex'), search = el('opdrachtZoeken'), status = el('beheerStatus');
  const confirmation = el('beheerBevestiging'), logout = el('beheerSluiten');
  let downloadUrl, access, rows = [], selected = '', dirty = false, busy = false;

  function changed() {
    dirty = true;
    confirmation.hidden = true;
    status.textContent = 'Je hebt wijzigingen die nog niet zijn opgeslagen.';
  }
  function allocateId() {
    const highest = Math.max(0, ...rows.map(row => Number(/^OpdrachtID(\d+)$/.exec(row.id || '')?.[1] || 0)));
    return `OpdrachtID${String(highest + 1).padStart(3, '0')}`;
  }
  function capture() {
    if (!selected) return;
    const row = JSON.parse(editor.value);
    if (!row || Array.isArray(row) || typeof row !== 'object') throw new Error('Gebruik één opdracht als JSON-object.');
    if (row.id !== selected) throw new Error('De ID staat vast. Maak een nieuwe opdracht voor een nieuwe ID.');
    if (typeof row.titel !== 'string' || !row.titel.trim()) throw new Error('Vul een titel in.');
    if (!['open', 'closed'].includes(row.status)) throw new Error('Gebruik status open of closed.');
    for (const key of ['domein', 'keywords']) {
      if (!Array.isArray(row[key]) || row[key].some(value => typeof value !== 'string')) throw new Error(`${key} moet een lijst met teksten zijn.`);
    }
    rows[rows.findIndex(item => item.id === selected)] = opdrachtFormaat.orden(row);
  }
  function render() {
    index.replaceChildren();
    const query = search.value.toLowerCase().trim();
    rows.filter(row => `${row.id} ${row.titel} ${row.bedrijf}`.toLowerCase().includes(query)).forEach(row => {
      const option = document.createElement('option');
      option.value = row.id;
      option.textContent = `${row.id} · ${row.bedrijf || 'Geen bedrijf'} — ${row.titel}`;
      index.appendChild(option);
    });
    index.value = selected;
    el('opdrachtVerwijderen').disabled = !selected;
  }
  function show(id) {
    selected = id;
    const row = rows.find(item => item.id === id);
    editor.value = row ? JSON.stringify(opdrachtFormaat.orden(row), null, 2) : '';
    editor.disabled = !row;
    el('opdrachtLabel').textContent = row ? id : 'Geen selectie';
    render();
  }
  function lock(value) {
    busy = value;
    for (const element of [...form.elements, ...open.elements]) element.disabled = value;
    if (!value) { editor.disabled = !selected; el('opdrachtVerwijderen').disabled = !selected; }
    logout.disabled = value;
  }
  open.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !open.reportValidity()) return;
    if (el('beheerNaam').value.trim() !== 'StageplatformTN_admin') {
      status.textContent = 'De adminnaam of het wachtwoord is onjuist.'; return;
    }
    lock(true);
    try {
      const payload = await opdrachtCrypto.laadBestand();
      const opened = await opdrachtCrypto.openBeheer(payload, el('beheerSleutel').value);
      const ids = new Set();
      for (const row of opened.data) {
        if (row.id !== undefined && (typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id))) throw new Error('Het bestand bevat lege of dubbele IDs.');
        if (row.id) ids.add(row.id);
      }
      access = opened; rows = opened.data;
      dirty = false;
      for (const row of rows) if (!row.id) { row.id = allocateId(); dirty = true; }
      el('beheerSleutel').value = '';
      open.hidden = true; logout.hidden = false; form.hidden = false;
      el('beheerTitel').textContent = 'Opdrachten beheren';
      show(rows[0]?.id || '');
      status.textContent = `${rows.length} opdrachten geladen.`;
      document.dispatchEvent(new Event('beheerlogin'));
    } catch (error) {
      status.textContent = 'Openen mislukt. Controleer je adminwachtwoord en verbinding.';
    } finally { lock(false); }
  });
  editor.addEventListener('input', changed);
  search.addEventListener('input', render);
  index.addEventListener('change', () => {
    const id = index.value;
    try { capture(); show(id); }
    catch (error) { index.value = selected; status.textContent = error.message; }
  });
  el('opdrachtToevoegen').addEventListener('click', () => {
    try {
      capture();
      const id = allocateId();
      rows.push({ ...opdrachtFormaat.standaard(), id, titel: 'Nieuwe opdracht' });
      search.value = ''; show(id); changed(); editor.focus();
    } catch (error) { status.textContent = error.message; }
  });
  el('opdrachtPlakToggle').addEventListener('click', () => {
    if (busy) return;
    const panel = el('opdrachtPlakkenPaneel');
    panel.hidden = !panel.hidden;
    el('opdrachtPlakToggle').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) el('opdrachtPlakJson').focus();
  });
  function importeerTekst(text, submissionId = '') {
    if (!text.trim()) throw new Error('Plak eerst de JSON uit de e-mail.');
    if (text.length > 1024 * 1024) throw new Error('De JSON is te groot (maximaal 1 MB).');
    const row = opdrachtFormaat.importeer(JSON.parse(text));
    capture();
    row.id = allocateId();
    if (submissionId) row.inzendingId = submissionId;
    rows.push(row);
    search.value = ''; show(row.id); changed();
    status.textContent = 'Opdracht geïmporteerd als gesloten. Controleer de inhoud en sla daarna op.';
  }
  document.addEventListener('beoordelingovernemen', event => {
    if (busy || !access) return;
    try {
      if (rows.some(row => row.inzendingId === event.detail.submissionId)) throw new Error('Deze inzending staat al in de opdrachtenlijst.');
      importeerTekst(JSON.stringify(event.detail.project), event.detail.submissionId);
      event.detail.accepted = true;
      editor.focus();
    } catch (error) { status.textContent = error.message; }
  });
  el('opdrachtPlakImporteren').addEventListener('click', () => {
    if (busy || !access) return;
    const input = el('opdrachtPlakJson');
    const feedback = el('opdrachtPlakStatus');
    try {
      importeerTekst(input.value);
      input.value = ''; feedback.textContent = '';
      el('opdrachtPlakkenPaneel').hidden = true;
      el('opdrachtPlakToggle').setAttribute('aria-expanded', 'false');
      editor.focus();
    } catch (error) {
      feedback.textContent = error instanceof SyntaxError
        ? 'Ongeldige JSON. Kopieer het volledige object uit opdracht_json, zonder de overige e-mailtekst.'
        : error.message;
    }
  });
  el('opdrachtVerwijderen').addEventListener('click', () => {
    if (!selected || !window.confirm(`${selected} verwijderen? Dit wordt definitief wanneer je opslaat.`)) return;
    rows = rows.filter(row => row.id !== selected);
    show(rows[0]?.id || ''); changed();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !access) return;
    try { capture(); } catch (error) { status.textContent = error.message; return; }
    lock(true); confirmation.hidden = true;
    status.textContent = 'Wijzigingen versleutelen en opslaan...';
    try {
      const payload = opdrachtToegang.beveiligd
        ? await opdrachtCrypto.bewaarBeheer(rows.map(opdrachtFormaat.orden), access)
        : rows.map(opdrachtFormaat.orden);
      const text = JSON.stringify(payload, null, 2) + '\n';
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = el('beheerDownload');
      link.download = opdrachtToegang.beveiligd ? 'opdrachten.json' : 'opdrachten-openbaar.json';
      link.href = downloadUrl;
      access.payload = payload; access.data = rows;
      el('beheerResultaat').textContent = opdrachtToegang.beveiligd
        ? `${rows.length} opdrachten versleuteld. Vervang data/opdrachten.json door de download en commit en push.`
        : `${rows.length} openbare opdrachten. Vervang data/opdrachten-openbaar.json door de download en commit en push.`;
      confirmation.hidden = false;
      link.click();
      dirty = false;
      status.textContent = 'Download gestart. Controleer je downloadmap.';
      render();
    } catch (error) { status.textContent = `Opslaan mislukt: ${error.message}`; }
    finally { lock(false); }
  });
  logout.addEventListener('click', () => {
    if (busy || (dirty && !window.confirm('Uitloggen zonder je wijzigingen op te slaan?'))) return;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = access = null; rows = []; selected = ''; dirty = false;
    el('beheerDownload').removeAttribute('href');
    open.reset(); form.reset(); index.replaceChildren(); editor.value = '';
    el('opdrachtPlakJson').value = ''; el('opdrachtPlakStatus').textContent = '';
    el('opdrachtPlakkenPaneel').hidden = true;
      el('opdrachtPlakToggle').setAttribute('aria-expanded', 'false');
    form.hidden = confirmation.hidden = logout.hidden = true; open.hidden = false;
    el('beheerTitel').textContent = 'Inloggen voor beheer';
    status.textContent = 'Je bent uitgelogd.';
    document.dispatchEvent(new Event('beheerlogout'));
  });
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
  if (!opdrachtToegang.beveiligd) {
    open.hidden = true;
    el('beheerTitel').textContent = 'Opdrachten beheren';
    document.querySelector('.assignment-admin-save span').textContent = 'Downloadt de openbare lijst, zonder versleuteling.';
    el('opgeslagenTitel').textContent = 'Openbare download klaar';
    lock(true);
    opdrachtToegang.laadOpenbaar().then(data => {
      const ids = new Set();
      for (const row of data) {
        if (!row || typeof row.titel !== 'string' || (row.id && ids.has(row.id))) throw new Error('Ongeldige opdrachtenlijst of dubbele IDs.');
        if (row.id) ids.add(row.id);
      }
      rows = data; access = { data };
      for (const row of rows) if (!row.id) { row.id = allocateId(); dirty = true; }
      form.hidden = false;
      show(rows[0]?.id || '');
      status.textContent = 'Openbare modus: wijzigingen worden pas gepubliceerd na commit en push.';
      document.dispatchEvent(new Event('beheerlogin'));
    }).catch(error => { status.textContent = error.message; }).finally(() => lock(false));
  }
})();
