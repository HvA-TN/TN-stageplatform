(() => {
  if (!opdrachtToegang.beveiligd) {
    document.getElementById('toegangForm').hidden = true;
    window.location.replace('opdrachten.html');
    return;
  }
  const form = document.getElementById('toegangForm');
  const input = document.getElementById('toegangSleutel');
  const studentnummer = document.getElementById('studentnummer');
  const button = document.getElementById('toegangKnop');
  const status = document.getElementById('toegangStatus');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled || !form.reportValidity()) return;
    if (!/^(?:[0-9]{9}|[A-Za-z]{9})$/.test(studentnummer.value)) {
      status.textContent = 'Vul precies negen cijfers of negen letters in, bijvoorbeeld 500123456 of abcdefghi.';
      studentnummer.focus();
      return;
    }
    if (!window.crypto?.subtle) {
      status.textContent = 'Open deze website via HTTPS om in te loggen.';
      return;
    }
    button.disabled = true;
    status.textContent = 'Toegang controleren...';
    try {
      let payload;
      try { payload = await opdrachtCrypto.laadBestand(); }
      catch (error) {
        status.textContent = 'De opdrachten konden niet worden geladen. Probeer het later opnieuw.';
        return;
      }
      let key;
      try { key = await opdrachtCrypto.openGast(payload, input.value); }
      catch (error) {
        try {
          const toegang = await opdrachtCrypto.openBeheer(payload, input.value);
          key = toegang.readKey;
        } catch (adminError) {
          status.textContent = 'Het wachtwoord is onjuist of het opdrachtenbestand is beschadigd.';
          input.select();
          return;
        }
      }
      await opdrachtCrypto.onthoud(key, payload);
      input.value = '';
      studentnummer.value = '';
      window.location.replace('opdrachten.html');
    } catch (error) {
      status.textContent = 'Inloggen is niet gelukt. Sta sessieopslag toe in je browser en probeer opnieuw.';
    } finally { button.disabled = false; }
  });
})();
