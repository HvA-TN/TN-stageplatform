(() => {
  if (!opdrachtToegang.beveiligd) {
    document.getElementById('beheerOpen').hidden = true;
    document.getElementById('beheerOpslaan').hidden = true;
    document.getElementById('beheerStatus').textContent = 'Wachtwoordbeveiliging is uitgeschakeld in site-instellingen.js. Wachtwoordbeheer is in deze modus niet nodig.';
    return;
  }
  const open = document.getElementById('beheerOpen');
  const save = document.getElementById('beheerOpslaan');
  const input = document.getElementById('beheerSleutel');
  const username = document.getElementById('beheerNaam');
  const newPassword = document.getElementById('beheerNieuweSleutel');
  const newMaster = document.getElementById('beheerNieuweMaster');
  const changes = [
    { button: document.getElementById('wijzigGast'), fields: document.getElementById('gastSleutelVelden'), input: newPassword, repeat: document.getElementById('gastSleutelHerhaal'), label: 'Gastwachtwoord aanpassen' },
    { button: document.getElementById('wijzigAdmin'), fields: document.getElementById('adminSleutelVelden'), input: newMaster, repeat: document.getElementById('adminSleutelHerhaal'), label: 'Adminwachtwoord aanpassen' }
  ].filter(change => change.button);
  const status = document.getElementById('beheerStatus');
  const saveButton = document.getElementById('beheerOpslaanKnop');
  const confirmation = document.getElementById('beheerBevestiging');
  const result = document.getElementById('beheerResultaat');
  const logout = document.getElementById('beheerSluiten');
  let toegang = null;
  let busy = false;
  const visibilityButtons = [...document.querySelectorAll('[data-password-toggle]')];
  function verbergWachtwoord(field) {
    field.type = 'password';
    const button = visibilityButtons.find(button => button.dataset.passwordToggle === field.id);
    if (button) { button.textContent = 'Tonen'; button.setAttribute('aria-pressed', 'false'); }
  }
  function controleerHerhaling(change) {
    const mismatch = change.input.value !== change.repeat.value;
    const message = mismatch ? 'De wachtwoorden komen niet overeen.' : '';
    change.repeat.setCustomValidity(message);
    const error = document.getElementById(change.repeat.getAttribute('aria-describedby'));
    const show = mismatch && change.repeat.value.length > 0;
    error.textContent = show ? message : '';
    error.hidden = !show;
    change.repeat.setAttribute('aria-invalid', String(show));
  }
  function sluitWachtwoordwijziging(change) {
    change.fields.hidden = change.fields.disabled = true;
    change.input.value = change.repeat.value = '';
    change.repeat.setCustomValidity('');
    verbergWachtwoord(change.input);
    verbergWachtwoord(change.repeat);
    controleerHerhaling(change);
    change.button.setAttribute('aria-expanded', 'false');
    change.button.textContent = change.label;
  }
  changes.forEach(change => {
    change.button.addEventListener('click', () => {
      if (busy) return;
      if (!change.fields.hidden) sluitWachtwoordwijziging(change);
      else {
        change.fields.hidden = change.fields.disabled = false;
        change.button.setAttribute('aria-expanded', 'true');
        change.button.textContent = 'Wachtwoordwijziging annuleren';
        change.input.focus();
      }
      confirmation.hidden = true;
    });
    [change.input, change.repeat].forEach(field => field.addEventListener('input', () => {
      controleerHerhaling(change);
    }));
  });
  changes.flatMap(change => [change.input, change.repeat]).filter(Boolean).forEach(field => field.addEventListener('input', () => {
    confirmation.hidden = true;
    status.textContent = 'Je hebt wijzigingen die nog niet zijn opgeslagen.';
  }));
  open.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !open.reportValidity()) return;
    if (username.value.trim() !== 'StageplatformTN_admin') {
      status.textContent = 'De adminnaam of het wachtwoord is onjuist.';
      return;
    }
    busy = true;
    status.textContent = 'Bestand ontsleutelen...';
    try {
      const payload = await opdrachtCrypto.laadBestand();
      toegang = await opdrachtCrypto.openBeheer(payload, input.value);
      input.value = '';
      save.hidden = false;
      open.hidden = true;
      logout.hidden = false;
      status.textContent = 'Ingelogd als admin. Kies welk wachtwoord je wilt wijzigen.';
    } catch (error) { status.textContent = 'Openen mislukt. Controleer je adminwachtwoord en verbinding. Het gedeelde gastwachtwoord werkt hier niet.'; }
    finally { busy = false; }
  });
  save.addEventListener('submit', async event => {
    event.preventDefault();
    changes.filter(change => !change.fields.disabled).forEach(controleerHerhaling);
    if (busy || !save.reportValidity()) return;
    busy = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Wijziging voorbereiden...';
    confirmation.hidden = true;
    status.textContent = 'Je wijzigingen worden versleuteld...';
    try {
      if (!toegang) throw new Error('Log eerst in met het adminwachtwoord.');
      const data = toegang.data;
      if (!Array.isArray(data) || data.some(o => !o || typeof o.titel !== 'string' || !['open', 'closed'].includes(o.status))) {
        throw new Error('Gebruik een lijst met opdrachten met een titel en status open of closed.');
      }
      const guestPassword = !changes[0] || changes[0].fields.disabled ? '' : newPassword.value;
      const masterPassword = !changes[1] || changes[1].fields.disabled ? '' : newMaster.value;
      if (changes.some(change => !change.fields.disabled && change.input.value !== change.repeat.value)) throw new Error('De wachtwoorden komen niet overeen.');
      if (!guestPassword && !masterPassword) throw new Error('Kies eerst een wachtwoord om te wijzigen.');
      for (const password of [guestPassword, masterPassword]) {
        if (password && (password.length < 8 || !/[A-Z]/.test(password))) throw new Error('Gebruik minimaal 8 tekens en 1 hoofdletter (A-Z).');
      }
      if (guestPassword && masterPassword && guestPassword === masterPassword) throw new Error('Kies verschillende wachtwoorden voor gast en admin.');
      const payload = await opdrachtCrypto.bewaarWachtwoorden(toegang, guestPassword, masterPassword);
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'toegang.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      result.textContent =
        (guestPassword ? 'Gastaccount: nieuw gedeeld wachtwoord. ' : 'Gastaccount: wachtwoord behouden. ') +
        (masterPassword ? 'Adminaccount: nieuw adminwachtwoord. ' : 'Adminaccount: adminwachtwoord behouden. ') +
        'Bewaar nieuwe wachtwoorden apart. Ze gaan pas in na publicatie van dit bestand.';
      confirmation.hidden = false;
      status.textContent = 'Download gestart. Volg de stappen hieronder om het nieuwe wachtwoord te activeren.';
    } catch (error) { status.textContent = `Wijziging niet bevestigd: ${error.message}`; }
    finally {
      busy = false;
      saveButton.disabled = false;
      saveButton.textContent = 'Wachtwoordwijziging bevestigen';
    }
  });
  logout.addEventListener('click', () => {
    if (busy) return;
    toegang = null;
    open.reset(); save.reset();
    changes.forEach(sluitWachtwoordwijziging);
    save.hidden = true; open.hidden = false;
    confirmation.hidden = true;
    logout.hidden = true;
    status.textContent = 'Je bent uitgelogd. Niet-opgeslagen wijzigingen zijn gewist.';
  });
})();
