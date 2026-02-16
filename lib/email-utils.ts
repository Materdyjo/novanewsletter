/**
 * Converts HTML to plain text for the text/plain part of multipart emails.
 * Helps email clients (e.g. Gmail) show the full message and avoid "shortened message" issues.
 */
export function htmlToPlainText(html: string): string {
  if (!html || !html.trim()) return "";

  let text = html
    // Remove script and style elements and their content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Replace block elements with newlines so structure is preserved
    .replace(/<\/?(?:br|p|div|tr|li|h[1-6])[^>]*>/gi, "\n")
    // Replace other block-level tags
    .replace(/<\/?(?:table|thead|tbody|ul|ol|hr)[^>]*>/gi, "\n")
    // Extract link URLs: <a href="...">...</a> -> "text (url)"
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, url, inner) => {
      const innerText = inner.replace(/<[^>]+>/g, "").trim();
      return innerText ? `${innerText} (${url})` : url;
    })
    // Remove all remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    // Collapse multiple newlines and trim each line
    .split(/\n/)
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text || "Newsletter – please view in HTML.";
}
