function escapeOpdracht(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function alsLijst(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function opdrachtTypes(opdracht) {
  return (opdracht.type || "").split("/").map(type => type.trim()).filter(Boolean);
}

function uploadDatumHtml(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const datum = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(datum.getTime()) || datum.toISOString().slice(0, 10) !== value) return "";
  const tekst = datum.toLocaleDateString("nl-NL", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  });
  return `<p class="assignment-upload-date">Geplaatst op <time datetime="${value}">${tekst}</time></p>`;
}

async function laadOpdrachten() {
  try {
    const opdrachten = (await (opdrachtToegang.beveiligd ? opdrachtCrypto.laadMetToegang() : opdrachtToegang.laadOpenbaar())).filter(
      opdracht => opdracht.status?.toLowerCase() === "open"
    );
    const form = document.getElementById("opdrachtFilters");
    const zoek = document.getElementById("zoekInput");
    const type = document.getElementById("typeFilter");
    const domein = document.getElementById("domeinFilter");

    function vulFilter(select, waarden) {
      [...new Set(waarden)].sort((a, b) => a.localeCompare(b, "nl")).forEach(waarde => {
        select.add(new Option(waarde, waarde));
      });
    }
    vulFilter(type, opdrachten.flatMap(opdrachtTypes));
    vulFilter(domein, opdrachten.flatMap(o => alsLijst(o.domein)));

    function filterOpdrachten() {
      const termen = zoek.value.trim().toLocaleLowerCase("nl").split(/\s+/).filter(Boolean);
      const gevonden = opdrachten.filter(o => {
        const tekst = [o.titel, o.bedrijf, o.locatie, o.beschrijving, o.type,
          o.periode, o.docent, ...alsLijst(o.domein), ...alsLijst(o.keywords)]
          .join(" ").toLocaleLowerCase("nl");
        return termen.every(term => tekst.includes(term)) &&
          (!type.value || opdrachtTypes(o).includes(type.value)) &&
          (!domein.value || alsLijst(o.domein).includes(domein.value));
      });
      toonOpdrachten(gevonden, opdrachten.length);
      const actief = document.getElementById("actieveFilters");
      actief.replaceChildren();
      [[zoek, "Zoeken"], [type, "Type"], [domein, "Domein"]].forEach(([veld, label]) => {
        if (!veld.value.trim()) return;
        const knop = document.createElement("button");
        knop.type = "button";
        knop.className = "assignment-keyword";
        knop.textContent = `${label}: ${veld.value.trim()} ×`;
        knop.setAttribute("aria-label", `${label}: ${veld.value.trim()} verwijderen`);
        knop.addEventListener("click", () => {
          veld.value = "";
          filterOpdrachten();
          veld.focus();
        });
        actief.appendChild(knop);
      });
      actief.hidden = !actief.childElementCount;
    }

    form.addEventListener("submit", event => event.preventDefault());
    zoek.addEventListener("input", filterOpdrachten);
    type.addEventListener("change", filterOpdrachten);
    domein.addEventListener("change", filterOpdrachten);
    form.addEventListener("reset", event => {
      event.preventDefault();
      zoek.value = type.value = domein.value = "";
      filterOpdrachten();
      zoek.focus();
    });
    filterOpdrachten();
  } catch (error) {
    if (!opdrachtToegang.beveiligd) {
      document.getElementById('zoekStatus').textContent = 'Opdrachten konden niet worden geladen. Probeer later opnieuw.';
      return;
    }
    opdrachtCrypto.uitloggen();
    window.location.replace('login.html');
  }
}

function toonOpdrachten(opdrachten, totaal) {
  const container = document.getElementById("opdrachtenContainer");
  container.replaceChildren();
  document.getElementById("zoekStatus").textContent =
    `${opdrachten.length} van ${totaal} openstaande opdrachten`;

  if (!opdrachten.length) {
    const melding = document.createElement("p");
    melding.className = "info-card";
    melding.textContent = totaal
      ? "Geen opdrachten gevonden. Pas je zoekopdracht aan of wis de filters."
      : "Er zijn op dit moment geen openstaande opdrachten. Bekijk deze pagina later opnieuw.";
    container.appendChild(melding);
    return;
  }

  opdrachten.forEach(o => {
    const card = document.createElement("article");
    card.className = "assignment-card";
    const beschrijving = String(o.beschrijving || "").trim();
    const samenvatting = beschrijving.length > 180
      ? `${beschrijving.slice(0, 180).replace(/\s+\S*$/, "")}…` : beschrijving;
    card.innerHTML = `
      <h2>${escapeOpdracht(o.titel)}</h2>
      <div class="assignment-subtitle">${escapeOpdracht(o.bedrijf)}</div>
      ${uploadDatumHtml(o.uploaddatum)}
      <div class="assignment-badges">
        ${[o.type, o.periode, o.locatie].filter(Boolean).map(waarde =>
          `<span class="assignment-keyword">${escapeOpdracht(waarde)}</span>`).join("")}
      </div>
      <p class="assignment-description assignment-preview">${escapeOpdracht(samenvatting)}</p>
      <details class="assignment-details">
        <summary><span class="assignment-show">Bekijk opdracht</span><span class="assignment-hide">Sluit details</span><span class="assignment-sr-only">: ${escapeOpdracht(o.titel)}</span></summary>
        <div class="assignment-detail-content">
          <h3>Over de opdracht</h3>
          <p class="assignment-description">${escapeOpdracht(beschrijving)}</p>
          <div class="assignment-meta">
            <div class="assignment-meta-item"><strong>Neem contact op met docent:</strong><br>${escapeOpdracht(o.docent)}</div>
            <div class="assignment-meta-item"><strong>Domein:</strong><br>${alsLijst(o.domein).map(escapeOpdracht).join("<br>")}</div>
          </div>
          <div class="assignment-keywords">${alsLijst(o.keywords).map(k =>
            `<span class="assignment-keyword">${escapeOpdracht(k)}</span>`).join("")}</div>
        </div>
      </details>`;
    container.appendChild(card);
  });
}

document.getElementById('uitloggen').hidden = !opdrachtToegang.beveiligd;
document.getElementById('uitloggen').addEventListener('click', () => {
  opdrachtCrypto.uitloggen();
  document.getElementById('opdrachtenContainer').replaceChildren();
  window.location.replace('login.html');
});
window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
laadOpdrachten();
