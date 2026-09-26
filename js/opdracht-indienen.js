(() => {
  if (window.siteInstellingen?.opdrachtIndienen !== true) return;
  const cloudflareActief = window.siteInstellingen.cloudflareActief === true;
  const emailActief = window.siteInstellingen.emailActief === true;
  if (!cloudflareActief && !emailActief) return;
  const form = document.getElementById('opdrachtFormulier');
  if (!form) return;
  const button = document.getElementById('opdrachtVersturen');
  const status = document.getElementById('inzendingStatus');
  const documentInput = document.getElementById('opdrachtDocument');
  document.getElementById('documentVeld').hidden = !cloudflareActief;
  documentInput.disabled = !cloudflareActief;
  documentInput.addEventListener('change', () => {
    const files = [...documentInput.files];
    const invalid = files.length > 2 || files.some(file => file.size > 5 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(file.name));
    documentInput.setCustomValidity(invalid ? (document.documentElement.lang === 'en'
      ? 'Choose up to 2 PDF or Word files, no more than 5 MB each.' : 'Kies maximaal 2 PDF- of Word-bestanden, elk maximaal 5 MB.') : '');
    documentInput.reportValidity();
  });
  let bezig = false;
  let melding = '';
  let foutdetail = '';
  let foutbron = '';
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
    if (foutdetail) status.textContent += ` (${foutbron}: ${foutdetail})`;
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
    foutdetail = '';
    foutbron = '';
    toonMelding();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      if (cloudflareActief) {
        foutbron = 'Inbox';
        if (!window.inzendingOntvangst?.enabled) throw new Error('Inboxkoppeling niet beschikbaar.');
        await window.inzendingOntvangst.bewaar(data, controller.signal);
      }
      if (emailActief) {
        foutbron = 'E-mail';
        // This token belongs to our Worker and has already been verified there.
        // Web3Forms has its own, separately configured captcha integration.
        data.delete('cf-turnstile-response');
        const files = data.getAll('document').filter(file => file?.size);
        if (files.length) {
          data.set('document_ontvangen', `${files.map(file => file.name).join(', ')} - beschikbaar in de beveiligde inbox.`);
          data.set('inzending_id', window.inzendingOntvangst.id());
          if (!String(data.get('message') || '').trim()) data.set('message', 'Opdracht met documenten ingediend. Download de bestanden in de beveiligde inbox.');
        }
        // File attachments are not part of the free email integration.
        data.delete('document');
        if (!String(data.get('message') || '').trim()) data.set('message', 'Opdracht ingediend zonder beschrijving of documenten.');
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data,
          signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok || result.success !== true) {
          throw new Error(typeof result.message === 'string' ? result.message.slice(0, 300) : `HTTP ${response.status}`);
        }
      }
      form.reset();
      documentInput.setCustomValidity('');
      window.inzendingOntvangst?.reset();
      melding = 'success';
    } catch (error) {
      foutdetail = error.name === 'AbortError'
        ? (document.documentElement.lang === 'en' ? 'Request timed out. Please retry.' : 'De aanvraag duurde te lang. Probeer opnieuw.')
        : String(error.message || 'Verbindingsfout').slice(0, 300);
      melding = cloudflareActief && emailActief && window.inzendingOntvangst?.opgeslagen() ? 'partial' : 'error';
    } finally {
      clearTimeout(timeout);
      bezig = false;
      button.disabled = false;
      toonMelding();
    }
  });
})();
