// PUBLICATIE-INSTELLINGEN
// true = aan, false = uit. Wijzigingen worden online actief na commit en push.
// Deze instellingen bevatten geen geheime wachtwoorden of toegangscodes.
window.siteInstellingen = {
  // true: gast/adminlogin aan; lees het versleutelde data/opdrachten.json.
  // false: geen gast/adminlogin; lees en bewerk data/opdrachten-openbaar.json.
  // Bestaande versleutelde gegevens worden niet omgezet of verwijderd.
  // De Cloudflare-inbox houdt altijd zijn eigen toegangscode.
  wachtwoordenActief: true,

  // Toont het bedrijfsformulier en de links ernaartoe.
  // false: geen nieuwe inzendingen via de website; bestaande inbox blijft beschikbaar.
  // Ook met true is het formulier verborgen als beide koppelingen hieronder uitstaan.
  opdrachtIndienen: true,

  // Automatische opslag van voorstellen in Cloudflare + inbox in beheer + Turnstile.
  // false: geen Cloudflare-verzoeken of spamcontrole vanuit de website.
  // Dit verwijdert geen inzendingen en deactiveert de Worker zelf niet.
  cloudflareActief: false,

  // Verstuurt de inzending via Web3Forms naar het ingestelde e-mailadres.
  // false: geen e-mail; met Cloudflare aan komt de inzending wel in de inbox.
  // Met alleen e-mail aan kun je opdracht_json uit de mail in beheer plakken.
  emailActief: true,

  // Openbare Worker-URL, zonder afsluitende slash. Alleen gebruikt bij Cloudflare aan.
  inzendingenApi: 'https://tn-stageplatform-inzendingen.j-busink.workers.dev',

  // Openbare Turnstile-sitekey voor spamcontrole. Geen secret key hier invullen.
  // REVIEW_TOKEN en TURNSTILE_SECRET staan uitsluitend bij de Cloudflare Worker.
  turnstileSitekey: '0x4AAAAAAFCZsWZaOQzgyo6m'
};
