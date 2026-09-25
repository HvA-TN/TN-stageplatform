(() => {
  const taalKnoppen = [...document.querySelectorAll('[data-form-language]')];
  let taal = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'nl';
  const titel = document.title;
  const teksten = [...document.querySelectorAll('[data-en]')].map(element => ({ element, nl: element.textContent }));
  const placeholders = [...document.querySelectorAll('[data-en-placeholder]')].map(element => ({ element, nl: element.placeholder }));
  const knop = document.getElementById('darkToggle');

  function themaLabel() {
    if (document.documentElement.lang !== 'en') return;
    const dark = document.body.classList.contains('dark-mode');
    knop.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    knop.title = dark ? 'Light theme' : 'Dark theme';
  }

  function wisselTaal() {
    const en = taal === 'en';
    taalKnoppen.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.formLanguage === taal)));
    document.documentElement.lang = en ? 'en' : 'nl';
    document.title = en ? 'Offer a project - Applied Physics' : titel;
    teksten.forEach(({ element, nl }) => { element.textContent = en ? element.dataset.en : nl; });
    placeholders.forEach(({ element, nl }) => { element.placeholder = en ? element.dataset.enPlaceholder : nl; });
    if (!en) {
      const dark = document.body.classList.contains('dark-mode');
      knop.setAttribute('aria-label', dark ? 'Schakel naar licht thema' : 'Schakel naar donker thema');
      knop.title = dark ? 'Licht thema' : 'Donker thema';
    }
    themaLabel();
    document.dispatchEvent(new Event('formlanguagechange'));
  }

  taalKnoppen.forEach(button => button.addEventListener('click', () => {
    taal = button.dataset.formLanguage;
    wisselTaal();
  }));
  document.addEventListener('themechange', themaLabel);
  wisselTaal();
})();
