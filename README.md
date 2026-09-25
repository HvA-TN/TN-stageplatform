# TN Stageplatform

Website: [TN Stageplatform](https://hva-tn.github.io/TN-stageplatform/)

Handleiding voor beheer en onderhoud van het stageplatform van Technische Natuurkunde.
Deze README wordt samen met de website in de repository gepubliceerd.

## Inhoud

- [Snel aan de slag](#snel-aan-de-slag)
- [Opdrachten en toegang](#opdrachten-en-toegang)
- [Website-architectuur](#website-architectuur)

## Snel aan de slag

### Dagelijks beheer

#### Bedrijven bijwerken

De kaart en bedrijvenlijst gebruiken `data/bedrijven.json`. Controleer wijzigingen
lokaal op beide pagina's voordat je dit openbare bestand publiceert.

#### Opdrachten bijwerken

1. Open via Home > Beheer de pagina **Opdrachten beheren** en log in als admin.
2. Kies een opdracht, maak een nieuwe of plak `opdracht_json` uit een inzendmail.
3. Controleer de velden en status. Alleen `open` is zichtbaar voor studenten.
4. Klik **Wijzigingen opslaan** en vervang lokaal `data/opdrachten.json` door de download.
5. Commit en push. Start pas daarna een nieuwe beheersessie: die laadt de gepubliceerde versie.

Bewerk het versleutelde bestand nooit rechtstreeks als gewone JSON-lijst.

### Lokaal bekijken en aanpassen met Live Server

1. Open de projectmap in Visual Studio Code.
2. Installeer de extensie **Live Server** als die nog niet aanwezig is.
3. Klik met rechts op `index.html` en kies **Open with Live Server**.
4. Bekijk de website via het lokale adres dat Live Server opent.
5. Pas HTML, CSS, JavaScript of openbare JSON aan in VS Code en sla op.
   Live Server vernieuwt de pagina na het opslaan.

Er is geen buildstap nodig. Open de pagina's via Live Server, niet rechtstreeks
als `file://`-bestand. Live Server publiceert niets naar GitHub.
Een download uit opdrachten- of wachtwoordbeheer moet je zelf in de juiste
`data`-map terugzetten. Je kunt die wijzigingen vervolgens lokaal controleren.
De Cloudflare-inbox vereist het ingestelde online domein en werkt niet standaard
via Live Server; de e-mailkoppeling kan wel lokaal worden gebruikt.

### Publiceren

Controleer `git status` en neem alle benodigde HTML-, CSS-, JavaScript- en
JSON-bestanden mee, inclusief nieuwe bestanden. Commit en push publiceert via
de ingestelde GitHub Pages-configuratie. Een download uit beheer wijzigt de
website niet automatisch.

Excelbestanden, Python-scripts, overige Markdown-documentatie, back-ups en oude
bestanden blijven lokaal volgens `.gitignore`. Alleen `README.md` is uitgezonderd. Deze uitsluiting verwijdert geen historische commits.

### Inzendformulier

`opdracht-aanbieden.html` biedt Nederlands en Engels (`?lang=en`). Web3Forms
verstuurt de inzending naar de ontvanger die bij de toegangscode is ingesteld.
De mail bevat `opdracht_json`; bedrijven krijgen geen technische downloadknoppen.
Docent, domein en trefwoorden vul je zelf aan in beheer.

Uitschakelen kan in `js/site-instellingen.js` met `opdrachtIndienen: false`.
Dit verbergt de verwijzingen en schakelt verzending vanuit de website uit.
Het wijzigt niet het account bij de formulierdienst.

## Opdrachten en toegang

### Inloggen

| Toegang | Invoer | Mogelijkheden |
| --- | --- | --- |
| Gast | Negen cijfers of negen letters (A-Z), plus gedeeld wachtwoord | Opdrachten bekijken |
| Admin | `StageplatformTN_admin`, plus adminwachtwoord | Opdrachten en wachtwoorden beheren |

Het studentnummer is alleen formaatcontrole, geen identiteitscontrole. De website
slaat het niet op en verstuurt het niet. Een eigen wachtwoordmanager kan het wel
onthouden als gebruikersnaam. Gemengde letters en cijfers worden niet geaccepteerd.
Het adminwachtwoord werkt ook op de gastlogin, met dezelfde formaatcontrole.
Wachtwoorden staan niet in deze documentatie.

### Opdrachten bewerken

1. Open `opdrachten-beheer.html` via Home > Beheer en log in.
2. Links kies je een opdracht op ID, bedrijf en titel; rechts bewerk je de JSON.
3. **Nieuwe opdracht** maakt een standaardobject. **Verwijderen** verwijdert de selectie uit de werklijst.
4. Klik onderaan op **Wijzigingen opslaan** voor de volledige versleutelde download.
5. Vervang lokaal `data/opdrachten.json`. Verwijder een eventueel nummer dat de browser aan de bestandsnaam heeft toegevoegd.
6. Commit en push. Controleer de publicatie en log opnieuw in.

De pagina leest bij inloggen de bestanden van de geopende website. Via Live Server
is dat je lokale versie; online is dat de gepubliceerde versie. Zet de download
daarom eerst lokaal terug en publiceer voordat je online verder bewerkt. Bestandskoppeling is niet nodig.
Bij een downloadprobleem kun je **Download opnieuw** gebruiken.

#### JSON-format in de editor

```json
{
  "titel": "Titel van de opdracht",
  "bedrijf": "Organisatie",
  "locatie": "Plaats",
  "type": "Stage/Afstuderen",
  "periode": "In overleg",
  "domein": [],
  "keywords": [],
  "beschrijving": "Beschrijving van de opdracht",
  "contact": "",
  "docent": "",
  "uploaddatum": "2026-09-24",
  "status": "closed",
  "id": "OpdrachtID005"
}
```

Behoud de bestaande ID en oorspronkelijke uploaddatum. Nieuwe beheeropdrachten
krijgen een volgnummer. `open` publiceert de opdracht voor ingelogde bezoekers;
`closed` bewaart de opdracht zonder deze te tonen. Domeinen en trefwoorden zijn
lijsten met teksten. Dit voorbeeld is de ontsleutelde inhoud, niet het formaat
van het opgeslagen `data/opdrachten.json`.

### JSON uit een inzendmail

Klik naast **Nieuwe opdracht** op **JSON uit e-mail**. Plak alleen de inhoud van
`opdracht_json`, van `{` tot en met `}`, en klik op **Importeren**.
Er is geen bestand of betaald formulierabonnement nodig voor deze werkwijze.
Elke import maakt een nieuwe opdracht met een eigen volgnummer en status `closed`.
Controleer de inhoud, vul docent/domeinen/trefwoorden aan en sla de lijst op.
De mail-ID is voorlopig; bestaande opdrachten worden niet overschreven.
Contactgegevens en toestemming voor het delen van e-mail staan apart in de mail.

### Wachtwoorden wijzigen

1. Open `wachtwoorden-beheer.html` en log in als admin.
2. Open **Gastwachtwoord aanpassen** en/of **Adminwachtwoord aanpassen**.
3. Vul het nieuwe wachtwoord tweemaal in: minimaal acht tekens en een hoofdletter (A-Z).
4. Klik **Wachtwoordwijziging bevestigen** en vervang alleen `data/toegang.json` door de download.
5. Commit en push om de wijziging te activeren.

De knoppen bij de accounts openen alleen de invoervelden. De onderste knop maakt
het nieuwe versleutelde bestand. Gesloten onderdelen behouden hun wachtwoord.
Publiceer een wachtwoordwijziging voordat je opnieuw wachtwoorden wijzigt.
Opdrachtenbeheer downloadt alleen `opdrachten.json`; wachtwoordbeheer alleen `toegang.json`.
Bij de eerste overgang moeten beide bestanden en de gewijzigde scripts samen worden gepubliceerd.
De bestaande wachtwoorden blijven daarbij geldig.

### Opslag en grenzen

`data/opdrachten.json` bevat de versleutelde opdrachten. `data/toegang.json` bevat
de versleutelde toegangssleutels, geen leesbare wachtwoorden. De bestanden gebruiken
AES-256-GCM en PBKDF2-SHA-256 met 600.000 iteraties. Bij de overgang blijft de
bestaande gastafleiding behouden; na een gastwachtwoordwijziging wordt ook deze
toegang als versleutelde sleutel opgeslagen.
Iedere export gebruikt nieuwe IVs; een gewijzigd wachtwoord krijgt een nieuwe salt.
De gasttoegang bewaart de gegevenssleutel in sessionStorage. Beheer houdt toegang
in het geheugen van de pagina. Uitloggen wist deze toegang voor de betreffende pagina.

Dit zijn gedeelde toegangsrollen, geen individuele accounts. Publiceren vereist
schrijfrechten op de repository. Eerdere downloads blijven met hun toenmalige
wachtwoorden leesbaar. Oude onversleutelde versies kunnen in Git-geschiedenis of
kopieen blijven bestaan. Een wachtwoordwijziging vervangt alleen de toegang en
ververst browsersessies, maar roteert de gegevenssleutel niet. Wie eerder de sleutel
of oude toegangsbestanden heeft bewaard, kan daarmee ook latere versies ontsleutelen.
Dit systeem biedt dus geen definitieve intrekking van eerder verleende toegang.
Bewaar geen ontsleutelde opdrachten in de openbare repository.

## Website-architectuur

### Paginas en opmaak

HTML-pagina's staan in de hoofdmap zodat bestaande links geldig blijven.
CSS: style.css laadt basis.css, paginas.css en thema.css, in die volgorde.
De cascade is behouden; verander themaregels bij voorkeur in thema.css.

### JavaScript

JavaScript per pagina: home.js, map.js, lijst.js, opdrachten.js, login.js,
opdrachten-index.js (opdrachtenbeheer), wachtwoorden-beheer.js en
opdracht-indienen.js (bedrijfsformulier). Gedeeld: theme.js,
site-instellingen.js, site-interface.js, opdracht-crypto.js en opdracht-formaat.js.
formulier-taal.js verzorgt de NL/EN-weergave van het bedrijfsformulier.
Laad gedeelde scripts voor het paginascript; er is geen buildstap nodig.

### Gegevens

JSON: data/bedrijven.json bevat de openbare bedrijfsgegevens.
data/opdrachten.json is een versleuteld pakket; wijzigingen gaan via beheer.
Het inhoudelijke opdrachtenformat wordt beheerd in opdracht-formaat.js.
De encryptie en bestandsversie worden beheerd in opdracht-crypto.js.
data/toegang.json bevat de versleutelde toegangsinstellingen.
data/opdrachten-openbaar.json wordt alleen gebruikt wanneer wachtwoordbeveiliging uitstaat.

### Publicatie

README.md wordt gepubliceerd. Excel, Python, overige Markdown-documentatie en
back-ups blijven lokaal volgens .gitignore.
Nieuwe CSS- en JS-bestanden moeten bij publicatie meegecommit worden.

### Voorkeur voor contact met studenten

Op het bedrijfsformulier staat een schakelaar voor rechtstreeks delen. Uit betekent
dat de docent eerst geschikte studenten selecteert en daarna de bedrijfscontactgegevens met hen
deelt; aan betekent delen van de opdracht en bedrijfscontactgegevens met studenten
zonder voorselectie. Deze voorkeur staat in de inzendmail onder `email_delen`.
De inzending blijft gesloten totdat de beheerder deze beoordeelt en publiceert.
Contactgegevens worden niet automatisch in de opdracht-JSON geplaatst.

## Cloudflare: automatische inzendingen instellen

De koppeling staat standaard uit. De bestaande Web3Forms-mail blijft werken.
Met `cloudflareActief: false` verstuurt de website geen gegevens naar Cloudflare.

### 1. Database

Maak in Cloudflare via Storage & databases > D1 SQL Database een database
`tn-stageplatform-inzendingen`. Open de Console van deze database en voer de
inhoud van `cloudflare/schema.sql` uit. De tabel bevat voorstellen en contactgegevens.

### 2. Worker

Open Compute (Workers) > Workers & Pages > Create application > Create Worker
(of Create application > Start with Hello World, afhankelijk van het dashboard).
Noem de Worker `tn-stageplatform-inzendingen`. Open Edit code en vervang de
voorbeeldcode door de volledige inhoud van `cloudflare/worker.mjs`. Deploy.

Voeg bij Bindings een D1 database toe met variabelenaam `DB`, gekoppeld aan
`tn-stageplatform-inzendingen`. Voeg bij Settings > Variables and Secrets toe:

| Naam | Type | Waarde |
| --- | --- | --- |
| SITE_ORIGIN | Text | `https://hva-tn.github.io` (zonder pad of afsluitende slash) |
| REVIEW_TOKEN | Secret | Een nieuwe willekeurige toegangscode van minimaal 32 tekens, uit je wachtwoordmanager |
| TURNSTILE_SECRET | Secret | De geheime sleutel uit stap 3 |

REVIEW_TOKEN is apart van het adminwachtwoord voor het versleutelde bestand.
Bewaar hem in je wachtwoordmanager en voer hem alleen in Cloudflare en de
inbox in. Zet geheimen nooit in site-instellingen.js of GitHub.

### 3. Spamcontrole

Maak onder Turnstile een Managed widget voor hostname `hva-tn.github.io`.
Bewaar de geheime sleutel als TURNSTILE_SECRET bij de Worker. De sitekey is
openbaar en wordt in de website-instellingen gebruikt. Publiceer de Worker
opnieuw nadat de binding en instellingen zijn toegevoegd.

### 4. Website koppelen

Vul in `js/site-instellingen.js` de `https://...workers.dev`-URL in bij
`inzendingenApi` en de openbare Turnstile-sitekey bij `turnstileSitekey`.
Zet `cloudflareActief: true` om de koppeling in te schakelen.
Commit en push alle nieuwe frontendbestanden en de instellingen. Voor gebruik
vanaf een ander domein moeten SITE_ORIGIN en de Turnstile-hostname overeenkomen.
De backend valideert het token, de hostname en de action server-side.

### 5. Werking en controle

Een inzending wordt eerst opgeslagen in D1, daarna verstuurt de browser de
bestaande Web3Forms-mail. Als alleen de mail mislukt, krijgt de indiener dit te
zien. Opnieuw proberen in hetzelfde tabblad maakt geen extra database-inzending
zolang de velden niet zijn aangepast. Een herladen formulier is een nieuwe inzending.

Log in op opdrachtenbeheer en open Te beoordelen met de inboxcode. Bekijk de
contactgegevens, klik Overnemen om te bewerken en publiceer via de bestaande
versleutelde download + commit/push. Een overgenomen opdracht begint gesloten.
Markeer daarna de inzending als afgehandeld. Dit is omkeerbaar via de lijst
Afgehandeld. De inzending blijft bewaard; afhandelen verwijdert geen persoonsgegevens.
Inzending-ID voorkomt dubbel overnemen zodra je de gewijzigde opdrachtenlijst
hebt opgeslagen en gepubliceerd. Contactgegevens worden niet automatisch in
de studentenlijst opgenomen.

De backend publiceert niet zelf naar GitHub. Een gastwachtwoord geeft geen
leesrechten op D1. Test na installatie met een herkenbare proefinzending:
controleer ontvangst in de inbox, de e-mail en toegang zonder inboxcode (moet
worden geweigerd). De lokale tests versturen geen e-mail en vervangen deze
controle van de daadwerkelijk ingestelde services niet.

## Koppelingen eenvoudig uitschakelen

Bewerk alleen `js/site-instellingen.js`, commit en push:

| Instelling | Effect van `false` |
| --- | --- |
| `cloudflareActief` | Geen inzendingen naar Cloudflare, geen Turnstile, geen inbox in beheer |
| `emailActief` | Geen verzending via Web3Forms |
| `opdrachtIndienen` | Gehele bedrijfsformulier en verwijzingen verbergen; de beheerinbox blijft bij actieve Cloudflare beschikbaar |

Met beide koppelingen op `false` wordt het formulier automatisch verborgen.
Met alleen e-mail actief blijft JSON plakken vanuit de mail mogelijk.
Met alleen Cloudflare actief komen inzendingen in de inbox zonder e-mail.
Instellingen, sleutels en URLs kunnen blijven staan zodat je later met `true`
weer kunt inschakelen. Controleer de actuele waarden in `js/site-instellingen.js`.

Dit stopt verbindingen vanuit de bijgewerkte website. Het verwijdert geen
bestaande inboxgegevens en schakelt de externe accounts of publieke endpoints
niet uit. Voor volledige opheffing verwijder/deactiveer je de Worker bij
Cloudflare en de toegangscode/koppeling bij Web3Forms afzonderlijk.

## Publicatiemodus: wachtwoorden aan of uit

In `js/site-instellingen.js` staat `wachtwoordenActief: true` standaard aan.
Zet dit bij een nieuwe publicatie op `false` om gast- en adminlogin over te slaan.
De website en de editor gebruiken dan uitsluitend `data/opdrachten-openbaar.json`.
Deze lijst bevat een gesloten voorbeeldopdracht; bestaande versleutelde opdrachten worden nooit automatisch
ontsleuteld, gekopieerd of verwijderd. Opslaan in beheer maakt in deze modus een
onversleutelde download `opdrachten-openbaar.json`. Vervang daarmee alleen het
openbare bestand en commit en push. Wachtwoordbeheer is in deze modus niet nodig.

Terug naar `true` gebruikt opnieuw het bestaande versleutelde bestand en zijn
wachtwoorden. Dit versleutelt een eerder gepubliceerde openbare lijst niet:
openbare bestanden blijven via hun URL en Git-geschiedenis toegankelijk.
De inbox blijft altijd zijn eigen toegangscode vereisen. Om ook de externe
koppelingen uit te zetten, zet `cloudflareActief` en `emailActief` op `false`.
Alle wijzigingen gaan pas online na commit en push.

### Template openbare opdrachten

`data/opdrachten-openbaar.json` bevat een voorbeeld met ID `OpdrachtID001` en
status `closed`. Dit verschijnt wel in openbaar beheer, maar niet in de
studentenlijst. Vul de voorbeeldvelden in en kies pas `open` als de opdracht
klaar is. `closed` verbergt alleen de kaart: het openbare JSON-bestand zelf is
zonder wachtwoord leesbaar. Gebruik dit bestand dus alleen voor openbare gegevens.
De werking van elke publicatie-instelling staat ook als commentaar direct boven
de instelling in `js/site-instellingen.js`.

