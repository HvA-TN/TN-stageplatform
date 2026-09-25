(() => {
  if (window.siteInstellingen?.opdrachtIndienen !== true) return;
  const cloudflareActief = window.siteInstellingen.cloudflareActief === true;
  const emailActief = window.siteInstellingen.emailActief === true;
  if (!cloudflareActief && !emailActief) return;
  const form = document.getElementById('opdrachtFormulier');
  if (!form) return;
  const button = document.getElementById('opdrachtVersturen');
  const status = document.getElementById('inzendingStatus');
  let bezig = false;
  let melding = '';
  const meldingen = {
    nl: {
      submit: 'Opdracht versturen', sending: 'Bezig met versturen...',
      pending: 'Je opdracht wordt verstuurd.',
      partial: 'Je opdracht staat klaar voor beoordeling, maar de e-mail is niet bevestigd. Je gegevens blijven staan; probeer opnieuw om de e-mail alsnog te versturen.',
      success: 'Bedankt! Je opdracht is ingediend bij de stagecoördinator en wordt beoordeeld voor plaatsing.',
      error: 'We konden de verzending niet bevestigen. Je ingevulde gegevens zijn behouden. Probeer het later opnieuw of mail je opdracht naar j.busink@hva.nl.'
    },
    en: {
      submit: 'Submit project', sending: 'Sending...',
      pending: 'Your project is being submitted.',
      partial: 'Your project is awaiting review, but the email was not confirmed. Your entries have been kept; retry to send the email.',
      success: 'Thank you! Your project has been submitted to the internship coordinator for review before publication.',
      error: 'We could not confirm your submission. Your entries have been kept. Please try again later or email your project to j.busink@hva.nl.'
    }
  };
  function toonMelding() {
    const teksten = meldingen[document.documentElement.lang] || meldingen.nl;
    button.textContent = bezig ? teksten.sending : teksten.submit;
    status.textContent = melding ? teksten[melding] : '';
  }
  document.addEventListener('formlanguagechange', toonMelding);

  function maakOpdrachtJson(data, datum = new Date()) {
    const tekst = naam => String(data.get(naam) || '').trim();
    return JSON.stringify({
      ...opdrachtFormaat.standaard(datum),
      titel: tekst('titel'),
      bedrijf: tekst('organisatie'),
      locatie: tekst('locatie'),
      type: tekst('type'),
      periode: tekst('periode') || 'In overleg',
      domein: [],
      keywords: [],
      beschrijving: tekst('message'),
      docent: '',
      status: 'closed'
    }, null, 2);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (bezig || !form.reportValidity()) return;
    const data = new FormData(form);
    if (data.get('botcheck')) return;
    data.set('email_delen', data.has('rechtstreeks_delen')
      ? 'Opdracht en contactgegevens rechtstreeks delen met studenten, zonder voorselectie.'
      : 'Docent selecteert eerst geschikte studenten; alleen zij ontvangen de contactgegevens.');
    data.delete('rechtstreeks_delen');
    data.set('opdracht_json', maakOpdrachtJson(data));

    bezig = true;
    button.disabled = true;
    melding = 'pending';
    toonMelding();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      if (cloudflareActief) {
        if (!window.inzendingOntvangst?.enabled) throw new Error('Inboxkoppeling niet beschikbaar.');
        await window.inzendingOntvangst.bewaar(data, controller.signal);
      }
      if (emailActief) {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data,
          signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok || result.success !== true) throw new Error('Verzending niet bevestigd');
      }
      form.reset();
      window.inzendingOntvangst?.reset();
      melding = 'success';
    } catch (error) {
      melding = cloudflareActief && emailActief && window.inzendingOntvangst?.opgeslagen() ? 'partial' : 'error';
    } finally {
      clearTimeout(timeout);
      bezig = false;
      button.disabled = false;
      toonMelding();
    }
  });
})();
