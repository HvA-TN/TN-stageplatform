(() => {
  const darkToggle = document.getElementById('darkToggle');
  const themeIcon = document.getElementById('themeIcon');

  function updateThemeIcon(theme) {
    if (!themeIcon) return;

    themeIcon.src =
      theme === 'dark'
        ? 'images/icons/darkmode.svg'
        : 'images/icons/lightmode.svg';
  }

  function pasThemaToe(theme) {
    const isDark = theme === 'dark';

    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);

    updateThemeIcon(theme);
    if (darkToggle) {
      darkToggle.setAttribute('aria-label', isDark ? 'Schakel naar licht thema' : 'Schakel naar donker thema');
      darkToggle.setAttribute('title', isDark ? 'Licht thema' : 'Donker thema');
    }
  }

  function huidigThema() {
    return localStorage.getItem('theme') || 'light';
  }

  function toggleThema() {
    const nieuwThema =
      document.body.classList.contains('dark-mode')
        ? 'light'
        : 'dark';

    localStorage.setItem('theme', nieuwThema);
    pasThemaToe(nieuwThema);

    document.dispatchEvent(
      new CustomEvent('themechange', {
        detail: { theme: nieuwThema }
      })
    );
  }

  pasThemaToe(huidigThema());

  if (darkToggle) {
    darkToggle.addEventListener('click', toggleThema);
  }
})();
