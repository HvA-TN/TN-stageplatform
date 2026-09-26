(() => {
  const el = id => document.getElementById(id);
  const open = el('beheerOpen'), form = el('beheerOpslaan'), editor = el('opdrachtVelden');
  const index = el('opdrachtIndex'), search = el('opdrachtZoeken'), status = el('beheerStatus');
  const confirmation = el('beheerBevestiging'), logout = el('beheerSluiten');
  let downloadUrl, access, rows = [], selected = '', dirty = false, busy = false;
  let keywords = [];
  const keywordInput = el('veld-keywords');

  function changed() {
    dirty = true;
    confirmation.hidden = true;
    status.textContent = 'Je hebt wijzigingen die nog niet zijn opgeslagen.';
  }
  function renderKeywords() {
    const list = el('trefwoordenLijst');
    list.replaceChildren();
    keywords.forEach((word, position) => {
      const chip = document.createElement('span');
      chip.className = 'keyword-chip';
      const label = document.createElement('span');
      label.textContent = word;
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = '\u00d7';
      remove.setAttribute('aria-label', `Verwijder trefwoord ${word}`);
      remove.addEventListener('click', () => {
        if (busy) return;
        keywords.splice(position, 1); renderKeywords(); changed(); keywordInput.focus();
      });
      chip.append(label, remove); list.appendChild(chip);
    });
    el('keywordsHint').textContent = `${keywords.length} van maximaal 6 trefwoorden. Voeg toe met Enter of de knop.`;
  }
  function addKeyword() {
    const word = keywordInput.value.trim();
    if (!word) return;
    if (keywords.some(value => value.toLocaleLowerCase() === word.toLocaleLowerCase())) {
      keywordInput.value = ''; return;
    }
    if (keywords.length >= 6) throw new Error('Je kunt maximaal 6 trefwoorden toevoegen. Verwijder eerst een trefwoord.');
    keywords.push(word); keywordInput.value = ''; renderKeywords(); changed();
  }
  function addKeywordFromInput() {
    if (busy || !selected) return;
    try { addKeyword(); } catch (error) { el('keywordsHint').textContent = error.message; }
    keywordInput.focus();
  }
  el('trefwoordToevoegen').addEventListener('click', addKeywordFromInput);
  keywordInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); addKeywordFromInput(); }
  });
  function allocateId() {
    const highest = Math.max(0, ...rows.map(row => Number(/^OpdrachtID(\d+)$/.exec(row.id || '')?.[1] || 0)));
    return `OpdrachtID${String(highest + 1).padStart(3, '0')}`;
  }
  function capture() {
    if (!selected) return;
    const row = { ...rows.find(item => item.id === selected) };
    for (const field of editor.querySelectorAll('[data-field]')) {
      const key = field.dataset.field;
      row[key] = field.value;
    }
    addKeyword();
    if (keywords.length > 6) throw new Error('Gebruik maximaal 6 trefwoorden. Verwijder eerst de extra trefwoorden.');
    row.keywords = [...keywords];
    const knownDomains = [...editor.querySelectorAll('[name=opdrachtDomein]')];
    // Preserve legacy domains that do not have a checkbox.
    const extraDomains = (row.domein || []).filter(value => !knownDomains.some(field => field.value === value));
    row.domein = [...knownDomains.filter(field => field.checked).map(field => field.value), ...extraDomains];
    if (!row.titel.trim()) { el('veld-titel').focus(); throw new Error('Vul een titel in.'); }
    if (!['open', 'closed'].includes(row.status)) throw new Error('Kies een geldige status.');
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
    keywords = [...(row?.keywords || [])];
    keywordInput.value = '';
    renderKeywords();
    const typeSelect = el('veld-type');
    typeSelect.querySelectorAll('[data-custom-type]').forEach(option => option.remove());
    if (row && ![...typeSelect.options].some(option => option.value === row.type)) {
      const option = document.createElement('option');
      option.value = row.type || '';
      option.textContent = row.type || 'Kies een type';
      option.dataset.customType = 'true';
      typeSelect.appendChild(option);
    }
    for (const field of editor.querySelectorAll('[data-field]')) {
      const value = row?.[field.dataset.field];
      field.value = Array.isArray(value) ? value.join('\n') : (value ?? '');
    }
    for (const field of editor.querySelectorAll('[name=opdrachtDomein]')) {
      field.checked = Boolean(row?.domein?.includes(field.value));
    }
    el('opdrachtLeeg').hidden = Boolean(row);
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
      search.value = ''; show(id); changed(); el('veld-titel').focus();
    } catch (error) { status.textContent = error.message; }
  });
  function importeerInzending(project, submissionId) {
    const row = opdrachtFormaat.importeer(project);
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
      importeerInzending(event.detail.project, event.detail.submissionId);
      event.detail.accepted = true;
      el('veld-titel').focus();
    } catch (error) { status.textContent = error.message; }
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
    open.reset(); form.reset(); index.replaceChildren(); show('');
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
