const zoekInput = document.getElementById('zoekInput');
const resetZoekopdracht = document.getElementById('resetZoekopdracht');
const zoekStatus = document.getElementById('zoekStatus');
const domeinLijst = document.getElementById('domeinLijst');
const provincieFilter = document.getElementById('provincieFilter');

const domeinen = [
  "High-tech systemen & materialen",
  "Data & digitalisering",
  "Energie & duurzaamheid",
  "Gezondheid & medische technologie",
  "Aarde, klimaat & ruimte",
  "Veiligheid & defensie"
];

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
    ...asArray(bedrijf.type)
  ]
    .join(' ')
    .toLowerCase();

  return tekst.includes(zoekterm.toLowerCase());
}

function filterBedrijven(bedrijven, zoekterm = '', provincie = '') {
  return bedrijven.filter((bedrijf) => {
    const matchZoek = bedrijfMatchtZoekterm(bedrijf, zoekterm);
    const matchProvincie = !provincie || bedrijf.provincie === provincie;
    return matchZoek && matchProvincie;
  });
}

function maakBedrijfHtml(bedrijf) {
  const naam = escapeHtml(bedrijf.naam || 'Onbekende organisatie');
  const plaats = escapeHtml(bedrijf.plaats || 'Onbekende locatie');
  const provincie = escapeHtml(bedrijf.provincie || '');
  const beschrijving = escapeHtml(
    bedrijf.beschrijving || 'Geen beschrijving beschikbaar.'
  );

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
      ${linksHtml ? `<div class="company-list-links">${linksHtml}</div>` : ''}
    </article>
  `;
}

function updateZoekStatus(aantalResultaten, zoekterm, provincie) {
  if (!zoekStatus) return;

  const heeftZoekterm = Boolean(zoekterm);
  const heeftProvincie = Boolean(provincie);

  if (!heeftZoekterm && !heeftProvincie) {
    zoekStatus.innerHTML = '';
    return;
  }

  const label = aantalResultaten === 1 ? 'organisatie' : 'organisaties';

  if (aantalResultaten === 0) {
    const filters = [
      heeftZoekterm ? `<strong>${escapeHtml(zoekterm)}</strong>` : '',
      heeftProvincie ? `<strong>${escapeHtml(provincie)}</strong>` : ''
    ].filter(Boolean).join(' in ');

    zoekStatus.innerHTML = `
      <section class="info-card">
        <p>Geen organisaties gevonden voor ${filters}.</p>
      </section>
    `;
    return;
  }

  let filterTekst = '';
  if (heeftZoekterm && heeftProvincie) {
    filterTekst = ` voor <strong>${escapeHtml(zoekterm)}</strong> in <strong>${escapeHtml(provincie)}</strong>`;
  } else if (heeftZoekterm) {
    filterTekst = ` voor <strong>${escapeHtml(zoekterm)}</strong>`;
  } else if (heeftProvincie) {
    filterTekst = ` in <strong>${escapeHtml(provincie)}</strong>`;
  }

  zoekStatus.innerHTML = `
    <section class="info-card">
      <p>${aantalResultaten} ${label} gevonden${filterTekst}.</p>
    </section>
  `;
}

function renderDomeinen(bedrijven, zoekterm = '', provincie = '') {
  if (!domeinLijst) return;

  const gefilterdeBedrijven = filterBedrijven(bedrijven, zoekterm, provincie);

  updateZoekStatus(gefilterdeBedrijven.length, zoekterm, provincie);

  const html = domeinen.map((domein) => {
    const bedrijvenInDomein = gefilterdeBedrijven
      .filter((bedrijf) => asArray(bedrijf.tags).includes(domein))
      .sort((a, b) => (a.naam || '').localeCompare(b.naam || '', 'nl'));

    const itemsHtml = bedrijvenInDomein.length > 0
      ? bedrijvenInDomein.map(maakBedrijfHtml).join('')
      : '<p class="company-list-empty">Geen organisaties gevonden binnen dit domein.</p>';

    const autoOpen = (zoekterm || provincie) && bedrijvenInDomein.length > 0
      ? 'open'
      : '';

    return `
      <details class="accordion-item" ${autoOpen}>
        <summary>${escapeHtml(domein)} (${bedrijvenInDomein.length})</summary>
        <div class="accordion-content">
          <div class="company-list">
            ${itemsHtml}
          </div>
        </div>
      </details>
    `;
  }).join('');

  domeinLijst.innerHTML = html;
}

function resetZoeken() {
  if (zoekInput) {
    zoekInput.value = '';
  }

  if (provincieFilter) {
    provincieFilter.value = '';
  }

  renderDomeinen(alleBedrijven, '', '');

  if (zoekInput) {
    zoekInput.focus();
  }
}

function huidigeZoekterm() {
  return zoekInput ? zoekInput.value.trim() : '';
}

function huidigeProvincie() {
  return provincieFilter ? provincieFilter.value : '';
}

function initialiseerEvents() {
  if (zoekInput) {
    zoekInput.addEventListener('input', () => {
      renderDomeinen(alleBedrijven, huidigeZoekterm(), huidigeProvincie());
    });

    zoekInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        resetZoeken();
      }
    });
  }

  if (provincieFilter) {
    provincieFilter.addEventListener('change', () => {
      renderDomeinen(alleBedrijven, huidigeZoekterm(), huidigeProvincie());
    });
  }

  if (resetZoekopdracht) {
    resetZoekopdracht.addEventListener('click', resetZoeken);
  }


}

function laadBedrijven() {
  fetch('data/bedrijven.json')
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Kon bedrijven.json niet laden: ${res.status}`);
      }
      return res.json();
    })
    .then((bedrijven) => {
      alleBedrijven = bedrijven;
      vulProvincies(alleBedrijven);
      renderDomeinen(alleBedrijven, huidigeZoekterm(), huidigeProvincie());
    })
    .catch((err) => {
      console.error(err);
      if (domeinLijst) {
        domeinLijst.innerHTML = `
          <section class="info-card">
            <p>Fout bij laden van bedrijven.</p>
          </section>
        `;
      }
    });
}

initialiseerEvents();
laadBedrijven();