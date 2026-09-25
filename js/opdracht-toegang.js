window.opdrachtToegang = {
  beveiligd: window.siteInstellingen?.wachtwoordenActief !== false,
  async laadOpenbaar() {
    const response = await fetch('data/opdrachten-openbaar.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('De openbare opdrachten konden niet worden geladen.');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Het openbare bestand moet een JSON-lijst zijn.');
    return data;
  }
};
