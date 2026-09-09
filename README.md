# TN Stageplatform

Stage- en afstudeerplatform van **Technische Natuurkunde – Hogeschool van Amsterdam**.

De website geeft een overzicht van bedrijven, stage- en afstudeeropdrachten en historische stagedata voor studenten en medewerkers van Technische Natuurkunde.

## Website

De website wordt via GitHub Pages gepubliceerd vanuit deze repository:

**HvA-TN / TN-stageplatform**

De belangrijkste onderdelen van de website zijn:

* overzicht van beschikbare stage- en afstudeeropdrachten;
* bedrijvenlijst;
* bedrijvenkaart;
* historische stagedata en statistieken.

https://hva-tn.github.io/TN-stageplatform/index.html
---

# Stage- en afstudeeropdrachten beheren:

De beschikbare opdrachten staan in:

`data/opdrachten.json`

Voor het toevoegen, aanpassen of sluiten van een opdracht hoeft normaal gesproken **geen HTML of JavaScript aangepast te worden**. De website leest de opdrachten automatisch uit dit bestand.

## Nieuwe opdracht toevoegen

Open:

`data/opdrachten.json`

Voeg vóór de laatste `]` een nieuw object toe.

Gebruik hiervoor het volgende format:

```json
{
    "titel": "Titel van de opdracht",
    "bedrijf": "Naam bedrijf of onderzoeksinstelling",
    "locatie": "Plaats",
    "type": "Stage/Afstuderen",
    "periode": "~September/~Februari",
    "domein": [
        "High-tech systemen & materialen"
    ],
    "keywords": [
        "Optica",
        "Python",
        "Sensoren",
        "Data-analyse",
        "Elektronica"
    ],
    "beschrijving": "Korte beschrijving van de opdracht. Beschrijf bij voorkeur de context, wat de student gaat onderzoeken of ontwikkelen en wat ongeveer het beoogde resultaat is.",
    "contact": "naam@hva.nl",
    "docent": "Naam docent",
    "status": "open"
}
```

Let erop dat tussen twee opdrachten een komma moet staan:

```json
{
    ...
},
{
    ...
}
```

Na de laatste opdracht staat **geen komma**.

---

## Betekenis van de velden

| Veld           | Betekenis                                | Voorbeeld                                         |
| -------------- | ---------------------------------------- | ------------------------------------------------- |
| `titel`        | Titel van de opdracht                    | `"Dual Beam Spectrometer"`                        |
| `bedrijf`      | Bedrijf of onderzoeksinstelling          | `"Avantes"`                                       |
| `locatie`      | Plaats waar de opdracht wordt uitgevoerd | `"Apeldoorn"`                                     |
| `type`         | Soort opdracht                           | `"Stage"`, `"Afstuderen"` of `"Stage/Afstuderen"` |
| `periode`      | Verwachte startperiode                   | `"~September"`, `"~Februari"`, `"In overleg"`     |
| `domein`       | Een of meerdere inhoudelijke domeinen    | `["High-tech systemen & materialen"]`             |
| `keywords`     | Zoektermen/onderwerpen van de opdracht   | `["Optica", "Python", "Spectroscopie"]`           |
| `beschrijving` | Korte inhoudelijke beschrijving          | Vrije tekst                                       |
| `contact`      | Contactpersoon voor studenten            | `"A.Achternaam@hva.nl"`                               |
| `docent`       | Verantwoordelijke HvA-docent             | `"Naam Docent Achternaam Docent"`                                  |
| `status`       | Beschikbaarheid                          | `"open"` of `"closed"`                            |

### Meerdere domeinen

Een opdracht kan onder meerdere domeinen vallen:

```json
"domein": [
    "High-tech systemen & materialen",
    "Data & digitalisering"
]
```

Gebruik waar mogelijk bestaande domeinnamen, zodat filtering op de website consistent blijft.

---

# Opdracht sluiten

Een opdracht hoeft niet verwijderd te worden wanneer deze niet meer beschikbaar is.

Verander:

```json
"status": "open"
```

in:

```json
"status": "closed"
```

Hierdoor kan de opdracht in de dataset blijven staan, terwijl deze niet meer als beschikbare opdracht wordt aangeboden.

Dit heeft de voorkeur boven het volledig verwijderen van oude opdrachten.

---

# Opdracht opnieuw openen

Een bestaande opdracht kan opnieuw beschikbaar worden gemaakt door:

```json
"status": "closed"
```

weer te veranderen in:

```json
"status": "open"
```

Controleer daarbij ook of `periode`, `contact`, `docent` en de beschrijving nog actueel zijn.

---

# Opdracht aanpassen

Zoek de betreffende opdracht in:

`data/opdrachten.json`

en wijzig de gewenste velden.

Bijvoorbeeld:

```json
"periode": "~Februari"
```

of:

```json
"contact": "andere.docent@hva.nl"
```

Na het committen van de wijziging wordt de aangepaste informatie door de website gebruikt.

---

# Aanpassen via GitHub

Voor kleine wijzigingen is het niet nodig om de repository lokaal te downloaden.

1. Open de repository op GitHub.
2. Ga naar `data/opdrachten.json`.
3. Klik rechtsboven op het **potloodje (Edit this file)**.
4. Voeg de opdracht toe of pas een bestaande opdracht aan.
5. Controleer goed of de JSON-structuur correct blijft.
6. Klik op **Commit changes**.
7. Geef de wijziging een korte beschrijving, bijvoorbeeld:

   `Nieuwe stageopdracht Avantes toegevoegd`

De wijziging staat daarna in de repository en wordt via GitHub Pages gepubliceerd.

---

# Lokaal werken

Voor grotere wijzigingen kan de repository lokaal worden gecloned.

```text
git clone https://github.com/HvA-TN/TN-stageplatform.git
cd TN-stageplatform
```

Na wijzigingen:

```text
git add .
git commit -m "Beschrijving van wijziging"
git push
```

---

# Structuur repository

```text
TN-stageplatform/
│
├── css/
│   └── styling van de website
│
├── data/
│   ├── bedrijven.json
│   ├── opdrachten.json
│   └── stage-statistiek.json
│
├── images/
│   └── afbeeldingen en iconen
│
├── js/
│   ├── data-dashboard.js
│   ├── lijst.js
│   ├── main.js
│   ├── opdrachten.js
│   └── theme.js
│
├── index.html
├── opdrachten.html
├── lijst.html
├── map.html
└── data.html
```

### `data/opdrachten.json`

Database met stage- en afstudeeropdrachten.

Dit is voor het reguliere beheer van nieuwe opdrachten het belangrijkste bestand.

### `data/bedrijven.json`

Data voor bedrijven die op het platform en/of de bedrijvenkaart worden weergegeven.

### `data/stage-statistiek.json`

Data voor historische stagegegevens en statistieken.

### `js/`

JavaScript waarmee de data wordt ingelezen en op de verschillende pagina's wordt weergegeven.

Normaal gesproken hoeft hier niets gewijzigd te worden bij het toevoegen van een nieuwe opdracht.

### `css/`

Vormgeving van de website, inclusief light/dark mode en de verschillende pagina-elementen.

---

# Controle na een wijziging

Controleer na het toevoegen van een opdracht altijd:

* staat de opdracht op de opdrachtenpagina?
* worden titel en bedrijf correct weergegeven?
* werkt filtering op domein?
* worden de keywords correct weergegeven?
* klopt de contactpersoon?
* staat de juiste periode aangegeven?
* is de opdracht daadwerkelijk beschikbaar wanneer `status` op `open` staat?

Als een opdracht niet verschijnt, controleer dan eerst `opdrachten.json`. Een ontbrekende komma, dubbele komma of ontbrekend aanhalingsteken kan ervoor zorgen dat het volledige JSON-bestand niet meer kan worden ingelezen.

Een JSON-validator kan eventueel worden gebruikt om de syntax te controleren.

---

# Voorbeeld complete opdracht

```json
{
    "titel": "Optische karakterisatie van een nieuwe sensor",
    "bedrijf": "Voorbeeldbedrijf",
    "locatie": "Amsterdam",
    "type": "Stage",
    "periode": "~Februari",
    "domein": [
        "High-tech systemen & materialen",
        "Data & digitalisering"
    ],
    "keywords": [
        "Optica",
        "Sensoren",
        "Python",
        "Data-analyse",
        "Experimentele fysica"
    ],
    "beschrijving": "Onderzoek de prestaties van een nieuwe optische sensor. Je bouwt een meetopstelling, voert systematische metingen uit en ontwikkelt een Python-analyse voor het bepalen van de belangrijkste sensorkarakteristieken. De resultaten worden gebruikt om het ontwerp van de volgende generatie sensor te verbeteren.",
    "contact": "docent@hva.nl",
    "docent": "Naam docent",
    "status": "open"
}
```

---

# Publicatie

De website wordt gepubliceerd via **GitHub Pages** vanuit de repository van de HvA-TN GitHub-organisatie.

Bij normale wijzigingen aan de data hoeft de website niet handmatig opnieuw gebouwd te worden. Na het committen/pushen van de wijzigingen kan het enige tijd duren voordat GitHub Pages de nieuwe versie toont.

---

# Beheer

Repository:

`HvA-TN/TN-stageplatform`

Organisatie:

`HvA-TN`

Het platform is bedoeld voor het beheren en presenteren van stage- en afstudeermogelijkheden voor studenten Technische Natuurkunde van de Hogeschool van Amsterdam.
