async function laadOpdrachten() {
  try {
    const response = await fetch("data/opdrachten.json");
    const opdrachten = await response.json();

    const openOpdrachten = opdrachten.filter(
      opdracht => opdracht.status?.toLowerCase() === "open"
    );

    if (openOpdrachten.length === 0) {
      window.location.replace("index.html");
      return;
    }

    toonOpdrachten(openOpdrachten);

  } catch (error) {
    console.error("Opdrachten konden niet worden geladen:", error);
    window.location.replace("index.html");
  }
}

function toonOpdrachten(opdrachten) {
  const container = document.getElementById("opdrachtenContainer");
  const status = document.getElementById("zoekStatus");

  container.className = "assignment-list";
  container.innerHTML = "";

  if (status) {
    status.textContent = `${opdrachten.length} opdracht(en) gevonden`;
  }

  opdrachten.forEach(o => {
    const card = document.createElement("article");
    card.className = "assignment-card";

    card.innerHTML = `
      <h3>${o.titel}</h3>

      <div class="assignment-subtitle">
        ${o.bedrijf}
      </div>

      <p class="assignment-description">
        ${o.beschrijving}
      </p>

        <div class="assignment-meta">

            <div class="assignment-meta-item">
                <strong>Type:</strong> ${o.type}<br>
                <strong>Periode:</strong> ${o.periode}<br>
                <strong>Locatie:</strong> ${o.locatie}
            </div>

            <div class="assignment-meta-item">
                <strong>Neem contact op met docent:</strong><br>
                <a href="${o.docent}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
                ${o.docent} <br>
                <a href="${o.contact}" target="_blank" rel="noopener noreferrer">
                    ${o.contact}
                </a>
            </div>

            <div class="assignment-meta-item">
                <strong>Domein:</strong><br>
                ${o.domein}
            </div>

        </div>

      <div class="assignment-keywords">
        ${(o.keywords || []).map(k => `<span class="assignment-keyword">${k}</span>`).join("")}
      </div>

      <span class="assignment-status">${o.status}</span>
    `;

    container.appendChild(card);
  });
}

laadOpdrachten();