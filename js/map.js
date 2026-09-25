const showMapBtn = document.getElementById('showMapBtn');
const showInfoBtn = document.getElementById('showInfoBtn');
const kaartView = document.getElementById('kaartView');
const infoView = document.getElementById('infoView');

const typeFilter = document.getElementById('typeFilter');
const tagFilter = document.getElementById('tagFilter');
const resetButton = document.getElementById('resetFilters');
const sidepanel = document.getElementById('sidepanel');
const darkToggle = document.getElementById('darkToggle');
const provincieFilter = document.getElementById('provincieFilter');
const favorietenFilterButton = document.getElementById('favorietenFilter');

let alleenFavorietenActief = false;

function updateFavorietenKnop() {
  if (!favorietenFilterButton) {
    return;
  }

  favorietenFilterButton.classList.toggle('active', alleenFavorietenActief);

  if (alleenFavorietenActief) {
    favorietenFilterButton.textContent = '★ Favorieten';
  } else {
    favorietenFilterButton.textContent = '☆ Favorieten';
  }
}

const map = L.map('map').setView([52.2, 5.3], 7);

/* =========================
   KAARTLAAG
   ========================= */

const mapTiles = L.tileLayer(
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }
);

mapTiles.addTo(map);
/* =========================
   DATA / MARKERS
   ========================= */

let alleBedrijven = [];
const markerCluster = L.markerClusterGroup({
  maxClusterRadius: 50
});
map.addLayer(markerCluster);

/* =========================
   HELPERS
   ========================= */

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined || value === '') {
    return [];
  }
  return [value];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* =========================
   VIEW LOGICA
   ========================= */

function toonKaartView() {
  if (!kaartView || !infoView || !showMapBtn || !showInfoBtn) {
    return;
  }

  kaartView.classList.remove('hidden-view');
  infoView.classList.add('hidden-view');

  showMapBtn.classList.add('active');
  showInfoBtn.classList.remove('active');

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

function toonInfoView() {
  if (!kaartView || !infoView || !showMapBtn || !showInfoBtn) {
    return;
  }

  kaartView.classList.add('hidden-view');
  infoView.classList.remove('hidden-view');

  showMapBtn.classList.remove('active');
  showInfoBtn.classList.add('active');
}


/* =========================
   SIDEPANEL
   ========================= */

function toonStandaardPanel() {
  if (!sidepanel) {
    return;
  }

  sidepanel.innerHTML = `
    <div class="sidepanel-placeholder">
      <h2>Bedrijfsinformatie</h2>
      <p>Klik op een marker om uitgebreide informatie te bekijken.</p>
    </div>
  `;
}

function toonGeenResultatenPanel() {
  if (!sidepanel) {
    return;
  }

  sidepanel.innerHTML = `
    <div class="sidepanel-placeholder">
      <h2>Geen resultaten</h2>
      <p>Er zijn geen bedrijven die voldoen aan de gekozen filters.</p>
    </div>
  `;
}

function toonBedrijfInPanel(bedrijf) {
  if (!sidepanel) {
    return;
  }
  const aantalKliks = aantalKliksVoorBedrijf(bedrijf);
  const bekekenTekst = aantalKliks === 1 ? '1 keer bekeken' : `${aantalKliks} keer bekeken`;
  const naam = escapeHtml(bedrijf.naam || 'Onbekende organisatie');
  const plaats = escapeHtml(bedrijf.plaats || 'Onbekende locatie');
  const provincie = escapeHtml(bedrijf.provincie || '');
  const locatie = provincie ? `${plaats}, ${provincie}` : plaats;

  const types = asArray(bedrijf.type);
  const tags = asArray(bedrijf.tags);

  const typeTekst = types.length > 0
    ? types.map(escapeHtml).join(', ')
    : 'Onbekend';

  const tagsTekst = tags.length > 0
    ? tags.map(escapeHtml).join(', ')
    : 'Geen tags';

  const beschrijving = escapeHtml(
    bedrijf.beschrijving || 'Geen beschrijving beschikbaar.'
  );

  const extraInfo = bedrijf.extraInfo
    ? escapeHtml(bedrijf.extraInfo)
    : '';

  const emailHtml = bedrijf.email
    ? `<a href="mailto:${escapeHtml(bedrijf.email)}">📧 E-mail</a>`
    : '';

  const docenten = [...new Set(asArray(bedrijf.docenten).map(naam => String(naam).trim()).filter(Boolean))];
  const docentenHtml = docenten.length
    ? `<div class="company-teachers"><span class="company-teachers-label">${docenten.length === 1 ? 'Betrokken docent' : 'Betrokken docenten'}</span><ul class="company-teachers-list">${docenten.map(naam => `<li>${escapeHtml(naam)}</li>`).join('')}</ul></div>`
    : '';

  let websiteHtml = '';

  if (Array.isArray(bedrijf.websites) && bedrijf.websites.length > 0) {
    websiteHtml = bedrijf.websites.map((site) => `
      <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer">
        🌐 ${escapeHtml(site.naam)}
      </a>
    `).join('');
  } else if (bedrijf.website) {
    websiteHtml = `
      <a href="${escapeHtml(bedrijf.website)}" target="_blank" rel="noopener noreferrer">
        🌐 Website
      </a>
    `;
  }

  const extraInfoHtml = extraInfo
    ? `
      <div class="company-section">
        <div class="company-section-inner">
          <h3>Extra informatie</h3>
          <p>${extraInfo}</p>
        </div>
      </div>
    `
    : '';

  const favorietLabel = isFavoriet(bedrijf)
    ? '★ Verwijder uit favorieten'
    : '☆ Voeg toe aan favorieten';

  const favorietKnopHtml = `
  <button id="favorietToggleKnop" type="button" class="favoriet-knop">
    ${favorietLabel}
  </button>
  `;

  sidepanel.innerHTML = `
    <div class="company-header">
      <h2>${naam}</h2>
      <div class="company-subtitle">${locatie}</div>
    </div>

    <div class="company-meta">
      <div class="company-meta-item"><strong>Type:</strong> ${typeTekst}</div>
      <div class="company-meta-item"><strong>Tags:</strong> ${tagsTekst}</div>
    </div>

    <div class="company-section">
      <div class="company-section-inner">
        <h3>Beschrijving</h3>
        <p>${beschrijving}</p>
      </div>
    </div>

    ${extraInfoHtml}

    <div class="company-section">
      <div class="company-section-inner">
        <h3>Links en contact</h3>
        ${docentenHtml}
        <div class="company-links">
          ${emailHtml}
          ${websiteHtml}
        </div>
      </div>
    </div>
        <div class="company-section">
      <div class="company-section-inner">
        <h3>Favoriet</h3>
        <div class="company-links">
          ${favorietKnopHtml}
        </div>
      </div>
    </div>
  `;

  const favorietToggleKnop = document.getElementById('favorietToggleKnop');

  if (favorietToggleKnop) {
    favorietToggleKnop.addEventListener('click', () => {
      toggleFavoriet(bedrijf);
      toonBedrijfInPanel(bedrijf);
      updateFavorietenKnop();
      renderFavorietenLijst(); 
      if (alleenFavorietenActief) {
  updateKaart({ resetPanel: false, herpositioneer: false });
}  
    });
  }
}

/* =========================
   FILTERS / CATEGORIEËN
   ========================= */
function renderFavorietenLijst() {
  const container = document.getElementById('favorietenContainer');
  if (!container) return;

  const favorieten = haalFavorietenOp();

  const favorietenBedrijven = alleBedrijven.filter((b) =>
    favorieten.includes(b.naam)
  );

  if (favorietenBedrijven.length === 0) {
    container.innerHTML = `
      <p class="company-list-empty">Nog geen favorieten geselecteerd.</p>
    `;
    return;
  }

  container.innerHTML = favorietenBedrijven
    .map((bedrijf) => maakBedrijfLijstHtml(bedrijf))
    .join('');

  voegFavorietListenersToe();
}

function voegFavorietListenersToe() {
  document.querySelectorAll('.favoriet-icoon').forEach((btn) => {
    btn.addEventListener('click', () => {
      const naam = btn.dataset.bedrijf;
      const bedrijf = alleBedrijven.find((b) => b.naam === naam);
      if (!bedrijf) return;

      toggleFavoriet(bedrijf);
      renderFavorietenLijst();
      updateKaart();
      updateFavorietenKnop();
    });
  });
}

function maakBedrijfLijstHtml(bedrijf) {
  const naam = escapeHtml(bedrijf.naam || '');
  const plaats = escapeHtml(bedrijf.plaats || '');
  const provincie = escapeHtml(bedrijf.provincie || '');
  const locatie = provincie ? `${plaats}, ${provincie}` : plaats;
  const aantalKliks = aantalKliksVoorBedrijf(bedrijf);
  const populariteitHtml = aantalKliks > 0
    ? `<div class="company-list-popularity"> ${aantalKliks}x bekeken</div>`
    : '';
  const ster = isFavoriet(bedrijf) ? '★' : '☆';

  let linksHtml = '';

  if (Array.isArray(bedrijf.websites) && bedrijf.websites.length > 0) {
    linksHtml = bedrijf.websites
      .map((site) => {
        const url = escapeHtml(site.url || '');
        const label = escapeHtml(site.naam || 'Website');
        if (!url) return '';
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      })
      .join('');
  } else if (bedrijf.website) {
    const url = escapeHtml(bedrijf.website);
    linksHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">Website</a>`;
  }

 return `
    <article class="company-list-item">
      <div class="company-list-item-header">
        <button
          class="favoriet-icoon"
          type="button"
          data-bedrijf="${naam}"
          aria-label="Toggle favoriet"
        >
          ${ster}
        </button>

        <div>
          <h3>${naam}</h3>
          <div class="company-list-place">${locatie}</div>
          ${populariteitHtml}
        </div>
      </div>

      ${linksHtml ? `<div class="company-list-links">${linksHtml}</div>` : ''}
    </article>
  `;
}

function voldoetAanFilter(bedrijf) {
  const gekozenType = typeFilter ? typeFilter.value : 'alles';
  const gekozenProvincie = provincieFilter ? provincieFilter.value : 'alles';
  const actieveTags = geselecteerdeTags();

  const types = asArray(bedrijf.type);
  const tags = asArray(bedrijf.tags);

  const typeOk = gekozenType === 'alles' || types.includes(gekozenType);
  const provincieOk =
    gekozenProvincie === 'alles' || bedrijf.provincie === gekozenProvincie;

  const tagsOk =
    actieveTags.length === 0 ||
    actieveTags.some((tag) => tags.includes(tag));

  const favorietOk =
    !alleenFavorietenActief || isFavoriet(bedrijf);

  return typeOk && provincieOk && tagsOk && favorietOk;
}

function vulProvincieFilterOpties(bedrijven) {
  if (!provincieFilter) {
    return;
  }

  const huidigeWaarde = provincieFilter.value || 'alles';

  const uniekeProvincies = [...new Set(
    bedrijven.map((bedrijf) => bedrijf.provincie).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'nl'));

  provincieFilter.innerHTML = '<option value="alles">Alles</option>';

  uniekeProvincies.forEach((provincie) => {
    const option = document.createElement('option');
    option.value = provincie;
    option.textContent = provincie;
    provincieFilter.appendChild(option);
  });

  if ([...provincieFilter.options].some((opt) => opt.value === huidigeWaarde)) {
    provincieFilter.value = huidigeWaarde;
  } else {
    provincieFilter.value = 'alles';
  }
}

function kleurVoorCategorie() {
  return '#475569';
}

function borderVoorMarker() { return document.body.classList.contains('dark-mode') ? '#0f172a' : '#ffffff'; }

function iconVoorBedrijf() {
  return L.divIcon({
    className: 'custom-pin-wrapper',
    html: '<div class="custom-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

/* =========================
   FILTEROPTIES OPBOUWEN
   ========================= */

function vulTypeFilterOpties(bedrijven) {
  if (!typeFilter) {
    return;
  }

  const huidigeWaarde = typeFilter.value || 'alles';

  const uniekeTypes = [...new Set(
    bedrijven.flatMap((bedrijf) => asArray(bedrijf.type))
  )]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'nl'));

  typeFilter.innerHTML = '<option value="alles">Alle types</option>';

  uniekeTypes.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    typeFilter.appendChild(option);
  });

  if ([...typeFilter.options].some((opt) => opt.value === huidigeWaarde)) {
    typeFilter.value = huidigeWaarde;
  } else {
    typeFilter.value = 'alles';
  }
}

function vulTagFilterOpties(bedrijven) {
  if (!tagFilter) {
    return;
  }

  const uniekeTags = [...new Set(
    bedrijven.flatMap((bedrijf) => asArray(bedrijf.tags))
  )]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'nl'));

  tagFilter.innerHTML = uniekeTags.map((tag, index) => `
    <label class="tag-filter-option" for="tag-${index}">
      <input
        type="checkbox"
        id="tag-${index}"
        value="${escapeHtml(tag)}"
      >
      <span>${escapeHtml(tag)}</span>
    </label>
  `).join('');

  tagFilter
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {
      checkbox.addEventListener('change', updateKaart);
    });
}

/* =========================
   POPUP / MARKERS
   ========================= */



function maakTooltipHtml(bedrijf) {
  const naam = escapeHtml(bedrijf.naam || 'Onbekende organisatie');
  const plaats = escapeHtml(bedrijf.plaats || 'Onbekende locatie');
  const provincie = escapeHtml(bedrijf.provincie || '');
  const locatie = provincie ? `${plaats}, ${provincie}` : plaats;

  return `
    <div class="marker-tooltip">
      <strong>${naam}</strong><br>
      <span>${locatie}</span>
    </div>
  `;
}

function tekenMarkers(bedrijven) {
  markerCluster.clearLayers();

  const markers = [];

  bedrijven.forEach((bedrijf) => {
    if (typeof bedrijf.lat !== 'number' || typeof bedrijf.lng !== 'number') {
      return;
    }

const marker = L.marker(
  [bedrijf.lat, bedrijf.lng],
  { icon: iconVoorBedrijf(bedrijf) }
)
  .bindTooltip(maakTooltipHtml(bedrijf), {
    direction: 'top',
    offset: [0, -10],
    opacity: 0.95
  })
  .on('click', () => {
    registreerBedrijfKlik(bedrijf);
    toonBedrijfInPanel(bedrijf);
    renderFavorietenLijst();
  });
  marker.on('mouseover', () => {
    const el = marker.getElement()?.querySelector('.custom-pin');
    if (el) el.style.transform = 'scale(1.2)';
  });

  marker.on('mouseout', () => {
    const el = marker.getElement()?.querySelector('.custom-pin');
    if (el) el.style.transform = 'scale(1)';
  });
    markers.push(marker);
    markerCluster.addLayer(marker);
  });

  if (markers.length > 0) {
    const groep = L.featureGroup(markers);
    map.fitBounds(groep.getBounds().pad(0.2));
  } else {
    map.setView([52.2, 5.3], 7);
  }
}

function geselecteerdeTags() {
  if (!tagFilter) {
    return [];
  }

  return [...tagFilter.querySelectorAll('input[type="checkbox"]:checked')]
    .map((checkbox) => checkbox.value);
}

function updateKaart() {
  const gefilterd = alleBedrijven.filter(voldoetAanFilter);

  requestAnimationFrame(() => {
    map.invalidateSize();
    tekenMarkers(gefilterd);

    if (gefilterd.length > 0) {
      toonStandaardPanel();
    } else {
      toonGeenResultatenPanel();
    }
  });
}

/* =========================
   DATA LADEN
   ========================= */

fetch('data/bedrijven.json')
  .then((res) => {
    if (!res.ok) {
      throw new Error(`Kon bedrijven.json niet laden: ${res.status}`);
    }
    return res.json();
  })
  .then((bedrijven) => {
    alleBedrijven = bedrijven;

    vulTypeFilterOpties(alleBedrijven);
    vulTagFilterOpties(alleBedrijven);
    vulProvincieFilterOpties(alleBedrijven);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        map.invalidateSize();
        updateKaart();
        updateFavorietenKnop();
        renderFavorietenLijst();    

      });
    });
  })
  .catch((err) => {
    console.error('Fout bij laden van bedrijven:', err);
    toonGeenResultatenPanel();
  });

/* =========================
   EVENT LISTENERS FILTERS
   ========================= */

if (typeFilter) {
  typeFilter.addEventListener('change', updateKaart);
}

if (tagFilter) {
  tagFilter.addEventListener('change', updateKaart);
}
if (provincieFilter) {
  provincieFilter.addEventListener('change', updateKaart);
}
if (favorietenFilterButton) {
  favorietenFilterButton.addEventListener('click', () => {
    alleenFavorietenActief = !alleenFavorietenActief;
    updateFavorietenKnop();
    updateKaart();
  });
}
if (resetButton) {
  resetButton.addEventListener('click', () => {
    if (typeFilter) {
      typeFilter.value = 'alles';
    }

    if (provincieFilter) {
      provincieFilter.value = 'alles';
    }

    if (tagFilter) {
      tagFilter
        .querySelectorAll('input[type="checkbox"]')
        .forEach((checkbox) => {
          checkbox.checked = false;
        });
    }

    alleenFavorietenActief = false;
    updateFavorietenKnop();
    updateKaart();
  });
}

/* =========================
   EVENT LISTENERS VIEW
   ========================= */

if (showMapBtn) {
  showMapBtn.addEventListener('click', toonKaartView);
}

if (showInfoBtn) {
  showInfoBtn.addEventListener('click', toonInfoView);
}

/* =========================
   DARK MODE TOGGLE
   ========================= */

const opgeslagenThema = localStorage.getItem('theme') || 'light';

document.body.classList.toggle('dark-mode', opgeslagenThema === 'dark');
document.body.classList.toggle('light-mode', opgeslagenThema !== 'dark');

updateKaart();

document.addEventListener('themechange', () => updateKaart());

/* =========================
   Favorieten
   ========================= */


function haalFavorietenOp() {
  try {
    return JSON.parse(localStorage.getItem('favorieten') || '[]');
  } catch {
    return [];
  }
}

function slaFavorietenOp(favorieten) {
  localStorage.setItem('favorieten', JSON.stringify(favorieten));
}

function isFavoriet(bedrijf) {
  const favorieten = haalFavorietenOp();
  return favorieten.includes(bedrijf.naam);
}

function toggleFavoriet(bedrijf) {
  const favorieten = haalFavorietenOp();

  if (favorieten.includes(bedrijf.naam)) {
    const nieuweFavorieten = favorieten.filter((naam) => naam !== bedrijf.naam);
    slaFavorietenOp(nieuweFavorieten);
  } else {
    favorieten.push(bedrijf.naam);
    slaFavorietenOp(favorieten);
  }
}

/* =========================
   Extract user-data
   ========================= */

   function haalKlikStatsOp() {
  try {
    return JSON.parse(localStorage.getItem('bedrijfKliks') || '{}');
  } catch {
    return {};
  }
}

function slaKlikStatsOp(stats) {
  localStorage.setItem('bedrijfKliks', JSON.stringify(stats));
}

function registreerBedrijfKlik(bedrijf) {
  const stats = haalKlikStatsOp();
  const naam = bedrijf.naam;

  stats[naam] = (stats[naam] || 0) + 1;
  slaKlikStatsOp(stats);
}

function aantalKliksVoorBedrijf(bedrijf) {
  const stats = haalKlikStatsOp();
  return stats[bedrijf.naam] || 0;
}

