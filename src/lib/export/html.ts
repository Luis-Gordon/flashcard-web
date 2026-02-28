/**
 * Strip HTML tags from card content, returning plain text.
 * Used by CSV and Markdown formatters to produce clean text output.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    // Preserve furigana: <ruby>kanji<rt>reading</rt></ruby> → kanji(reading)
    // Handles optional attributes on <ruby>/<rt> and optional <rp> fallback tags
    .replace(/<ruby[^>]*>([^<]*?)(?:<rp>[^<]*<\/rp>)?<rt[^>]*>([^<]*?)<\/rt>(?:<rp>[^<]*<\/rp>)?<\/ruby>/gi, "$1($2)")
    .replace(/<\/?(div|p|span|section|h[1-6]|ul|ol|li|ruby|rt|table|tr|td|th|pre|code|blockquote|a|em|strong|b|i|u|s|sub|sup|hr)[^>]*>/gi, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
