window.opdrachtFormaat = (() => {
  const nieuwId = () => `OpdrachtID${100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000}`;
  function standaard(datum = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(datum);
    const part = type => parts.find(item => item.type === type).value;
    return { titel: '', bedrijf: '', locatie: '', type: 'Stage', periode: 'In overleg', domein: [], keywords: [], beschrijving: '', contact: '', docent: '', uploaddatum: `${part('year')}-${part('month')}-${part('day')}`, status: 'closed', id: nieuwId() };
  }
  function importeer(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Kies een JSON-bestand met één opdracht.');
    const result = standaard();
    for (const key of Object.keys(result)) {
      if (['id', 'status'].includes(key) || value[key] === undefined) continue;
      if (Array.isArray(result[key])) {
        if (!Array.isArray(value[key]) || value[key].some(item => typeof item !== 'string')) throw new Error(`${key} moet een lijst met teksten zijn.`);
      } else if (typeof value[key] !== 'string') throw new Error(`${key} moet tekst zijn.`);
      result[key] = value[key];
    }
    if (!result.titel.trim()) throw new Error('Vul eerst een titel in.');
    return result;
  }
  function orden(value) {
    const result = { ...standaard(), ...value };
    const id = result.id;
    delete result.id;
    return { ...result, id };
  }
  return { nieuwId, standaard, importeer, orden };
})();
