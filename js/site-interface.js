(() => {
  const onderdeel = document.getElementById('opdrachtIndienen');
  const uitnodiging = document.getElementById('opdrachtAanbiedenBalk');
  const submissionLinks = document.querySelectorAll('[data-submission-link]');
  const uitgeschakeld = document.getElementById('inzendingUitgeschakeld');
  if (window.siteInstellingen?.opdrachtIndienen !== true ||
      (!window.siteInstellingen.cloudflareActief && !window.siteInstellingen.emailActief)) {
    onderdeel?.remove();
    uitnodiging?.remove();
    submissionLinks.forEach(link => link.remove());
    if (uitgeschakeld) uitgeschakeld.hidden = false;
    return;
  }
  if (uitnodiging) uitnodiging.hidden = false;
  submissionLinks.forEach(link => { link.hidden = false; });
  if (!onderdeel) return;
  onderdeel.hidden = false;
  const privacyEmail = document.getElementById('privacyEmail');
  const privacyInbox = document.getElementById('privacyInbox');
  if (privacyEmail) privacyEmail.hidden = window.siteInstellingen.emailActief !== true;
  if (privacyInbox) privacyInbox.hidden = window.siteInstellingen.cloudflareActief !== true;

})();
