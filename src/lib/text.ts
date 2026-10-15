/**
 * Split copy written with *asterisks* into plain and emphasised parts, so a template can
 * wrap the emphasised ones in <em> without rendering raw HTML.
 * "I turn *messy data* into…" → [{ text: 'I turn ' }, { text: 'messy data', em: true }, …]
 */
export function splitEmphasis(text: string) {
  return text
    .split('*')
    .map((part, index) => ({ text: part, em: index % 2 === 1 }))
    .filter((part) => part.text.length > 0);
}

/** The same copy with the asterisks removed, for meta descriptions and alt text. */
export function stripEmphasis(text: string) {
  return text.replaceAll('*', '');
}
