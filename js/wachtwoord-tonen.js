(() => {
  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    const field = document.getElementById(button.dataset.passwordToggle);
    if (!field) return;
    const hide = () => {
      field.type = 'password';
      button.textContent = 'Tonen';
      button.setAttribute('aria-pressed', 'false');
    };
    button.addEventListener('click', () => {
      const visible = field.type === 'password';
      field.type = visible ? 'text' : 'password';
      button.textContent = visible ? 'Verbergen' : 'Tonen';
      button.setAttribute('aria-pressed', String(visible));
    });
    field.form?.addEventListener('reset', hide);
    field.form?.addEventListener('submit', hide);
    window.addEventListener('pageshow', hide);
  });
})();
