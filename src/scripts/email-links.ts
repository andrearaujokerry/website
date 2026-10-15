// Turn every link carrying data-email-user and data-email-domain into a mailto link.
// The full address is assembled in the browser, so it never appears in the HTML that
// scrapers read. Without JavaScript the links keep their fallback href (the contact section).
document
  .querySelectorAll<HTMLAnchorElement>('a[data-email-user][data-email-domain]')
  .forEach((link) => {
    const { emailUser, emailDomain } = link.dataset;
    if (emailUser && emailDomain) link.href = `mailto:${emailUser}@${emailDomain}`;
  });
