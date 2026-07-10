async function laadDashboard() {
  const response = await fetch("data/stage-statistiek.json");
  const bedrijven = await response.json();

  bedrijven.sort((a, b) => b.aantal_totaal - a.aantal_totaal);

  maakBarChart(
    "bedrijvenChart",
    bedrijven.map(b => b.bedrijf),
    bedrijven.map(b => b.aantal_totaal),
    "Aantal studenten"
  );
}