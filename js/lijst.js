const zoekInput = document.getElementById('zoekInput');
const resetZoekopdracht = document.getElementById('resetZoekopdracht');
const zoekStatus = document.getElementById('zoekStatus');
const bedrijvenLijst = document.getElementById('bedrijvenLijst');
const typeFilter = document.getElementById('typeFilter');
const tagFilter = document.getElementById('tagFilter');
const provincieFilter = document.getElementById('provincieFilter');

let alleBedrijven = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function vulProvincies(bedrijven) {
  if (!provincieFilter) return;

  const provincies = [...new Set(
    bedrijven.map((bedrijf) => bedrijf.provincie).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'nl'));

  provincieFilter.innerHTML =
    '<option value="">Alle provincies</option>' +
    provincies
      .map((provincie) => (
        `<option value="${escapeHtml(provincie)}">${escapeHtml(provincie)}</option>`
      ))
      .join('');
}

function bedrijfMatchtZoekterm(bedrijf, zoekterm) {
  if (!zoekterm) return true;

  const tekst = [
    bedrijf.naam || '',
    bedrijf.plaats || '',
    bedrijf.provincie || '',
    bedrijf.beschrijving || '',
    ...asArray(bedrijf.tags),
    ...asArray(bedrijf.type),
    ...asArray(bedrijf.docenten)
  ]
    .join(' ')
    .toLowerCase();

  return zoekterm.toLowerCase().split(/\s+/).filter(Boolean).every(term => tekst.includes(term));
}

function filterBedrijven(bedrijven, zoekterm = '', provincie = '', type = '', domeinen = []) {
  return bedrijven.filter((bedrijf) => {
    const matchZoek = bedrijfMatchtZoekterm(bedrijf, zoekterm);
    const matchProvincie = !provincie || bedrijf.provincie === provincie;
    return matchZoek && matchProvincie &&
      (!type || asArray(bedrijf.type).includes(type)) &&
      (!domeinen.length || domeinen.some(domein => asArray(bedrijf.tags).includes(domein)));
  });
}

function maakBedrijfHtml(bedrijf) {
  const naam = escapeHtml(bedrijf.naam || 'Onbekende organisatie');
  const plaats = escapeHtml(bedrijf.plaats || 'Onbekende locatie');
  const provincie = escapeHtml(bedrijf.provincie || '');
  const beschrijving = escapeHtml(
    bedrijf.beschrijving || 'Geen beschrijving beschikbaar.'
  );

  const docenten = asArray(bedrijf.docenten).filter(Boolean).map(escapeHtml);
  const locatie = provincie ? `${plaats}, ${provincie}` : plaats;

  let linksHtml = '';

  if (Array.isArray(bedrijf.websites) && bedrijf.websites.length > 0) {
    linksHtml = bedrijf.websites
      .map((site) => {
        const url = escapeHtml(site.url || '');
        const label = escapeHtml(site.naam || 'Website');
        if (!url) return '';
        return `
          <a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>
        `;
      })
      .filter(Boolean)
      .join('');
  } else if (bedrijf.website) {
    const url = escapeHtml(bedrijf.website);
    linksHtml = `
      <a href="${url}" target="_blank" rel="noopener noreferrer">Website</a>
    `;
  }

  return `
    <article class="company-list-item">
      <div class="company-list-item-header">
        <h3>${naam}</h3>
        <div class="company-list-place">${locatie}</div>
      </div>
      <p>${beschrijving}</p>
      ${docenten.length ? `<p class="company-list-teachers"><strong>${docenten.length === 1 ? 'Docent' : 'Docenten'}:</strong> ${docenten.join(', ')}</p>` : ''}
      ${linksHtml ? `<div class="company-list-links">${linksHtml}</div>` : ''}
    </article>
  `;
}

function vulKeuzes(select, waarden, label) {
  select.innerHTML = `<option value="">${label}</option>` +
    [...new Set(waarden)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'nl'))
      .map(waarde => `<option value="${escapeHtml(waarde)}">${escapeHtml(waarde === 'onderzoek' ? 'Onderzoeksinstituut' : waarde === 'bedrijf' ? 'Bedrijf' : waarde)}</option>`).join('');
}

function vulDomeinen(bedrijven) {
  const domeinen = [...new Set(bedrijven.flatMap(b => asArray(b.tags)))].filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'nl'));
  tagFilter.innerHTML = domeinen.map(domein => `
    <label class="tag-filter-option">
      <input type="checkbox" value="${escapeHtml(domein)}">
      <span>${escapeHtml(domein)}</span>
    </label>`).join('');
}

function geselecteerdeDomeinen() {
  return [...tagFilter.querySelectorAll('input[type="checkbox"]:checked')].map(veld => veld.value);
}

function renderBedrijven() {
  const gevonden = filterBedrijven(alleBedrijven, zoekInput.value.trim(),
    provincieFilter.value, typeFilter.value, geselecteerdeDomeinen())
    .sort((a, b) => (a.naam || '').localeCompare(b.naam || '', 'nl') ||
      (a.plaats || '').localeCompare(b.plaats || '', 'nl'));
  zoekStatus.textContent = `${gevonden.length} van ${alleBedrijven.length} organisaties`;
  bedrijvenLijst.innerHTML = gevonden.length
    ? gevonden.map(maakBedrijfHtml).join('')
    : '<p class="company-list-empty">Geen organisaties gevonden. Pas je zoekopdracht aan of wis de filters.</p>';
}

function resetZoeken() {
  [zoekInput, provincieFilter, typeFilter].forEach(veld => { veld.value = ''; });
  tagFilter.querySelectorAll('input[type="checkbox"]').forEach(veld => { veld.checked = false; });
  renderBedrijven();
  zoekInput.focus();
}

zoekInput.addEventListener('input', renderBedrijven);
zoekInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') resetZoeken();
});
[provincieFilter, typeFilter, tagFilter].forEach(veld => {
  veld.addEventListener('change', renderBedrijven);
});
resetZoekopdracht.addEventListener('click', resetZoeken);

async function laadBedrijven() {
  try {
    const response = await fetch('data/bedrijven.json');
    if (!response.ok) throw new Error(`Kon bedrijven.json niet laden: ${response.status}`);
    alleBedrijven = await response.json();
    vulProvincies(alleBedrijven);
    vulKeuzes(typeFilter, alleBedrijven.flatMap(b => asArray(b.type)), 'Alle types');
    vulDomeinen(alleBedrijven);
    renderBedrijven();
  } catch (error) {
    console.error(error);
    zoekStatus.textContent = 'De bedrijven konden niet worden geladen. Vernieuw de pagina om het opnieuw te proberen.';
  }
}

laadBedrijven();
