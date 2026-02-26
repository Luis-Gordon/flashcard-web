import DOMPurify from "dompurify";

export function SanitizedHTML({ html, className }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "div", "span", "p", "br", "strong", "em", "b", "i", "u",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
      "ruby", "rt", "rp", "sub", "sup", "code", "pre", "mark",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: ["class", "lang"],
  });
  // Safe: content is sanitized by DOMPurify above with strict allowlists
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
