// Assemble email addresses in the browser, so the full address never appears in the HTML
// that scrapers read. Without JavaScript the fallbacks stay in place.
//
// - <a data-email-user data-email-domain> becomes a mailto link (fallback: its own href).
// - Add data-email-text to also show the address as the link text (used by the résumé).
document
  .querySelectorAll<HTMLAnchorElement>('a[data-email-user][data-email-domain]')
  .forEach((link) => {
    const { emailUser, emailDomain } = link.dataset;
    if (!emailUser || !emailDomain) return;
    const address = `${emailUser}@${emailDomain}`;
    link.href = `mailto:${address}`;
    if (link.hasAttribute('data-email-text')) link.textContent = address;
  });
