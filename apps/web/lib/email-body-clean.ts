/**
 * cleanEmailBody — strip the marketing / tracking artefacts that
 * pollute the plaintext part of marketing emails, while preserving
 * the actual content of the message (including useful tracking-host
 * links the sender embedded on purpose).
 *
 * Rule of thumb: a line is an artefact ONLY if it's:
 *   - an unsubscribe / view-in-browser / preferences link, OR
 *   - a standalone very long encoded URL/token blob (>250 chars,
 *     no surrounding prose), OR
 *   - a pure base64-style gibberish blob with no spaces
 *
 * Everything else is kept — including normal-length tracking links
 * (Postmark, Mailchimp, etc.) that the sender uses as their actual
 * call-to-action.
 */

// "Unsubscribe" / "se désabonner" / "manage preferences" / "view in
// browser" — any of these appearing on a line together with a URL marks
// the line as boilerplate footer.
const UNSUBSCRIBE_LINE_RX =
  /\b(unsubscribe|se\s+d[ée]sinscrire|d[ée]sabonn(?:er|ement)|opt[\s-]?out|manage\s+(?:your\s+)?preferences|update\s+(?:your\s+)?preferences|email\s+preferences|view\s+(?:this\s+)?(?:e?mail|message)\s+in\s+(?:your\s+)?browser|voir\s+(?:ce|cet?)\s+(?:e?mail|message)\s+dans\s+(?:votre\s+|le\s+)?navigateur|view\s+online|consulter\s+en\s+ligne)\b/i;

/**
 * Decide if a single line should be dropped. Conservative: when in
 * doubt, KEEP the line. False-negatives (a small leak of footer
 * text) are far cheaper than false-positives (eating real content).
 */
function isArtefactLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // 1. Unsubscribe / preferences / view-in-browser + URL on the same
  // line. This is the most common footer pattern.
  if (UNSUBSCRIBE_LINE_RX.test(trimmed) && /https?:\/\//.test(trimmed)) {
    return true;
  }

  // 2. Standalone very long URL token blob — a single URL of 250+
  // chars on a line by itself (allowing for an optional 3-word lead-in
  // before the URL). This catches the giant postmark unsubscribe URL
  // that wraps onto a logical "single line" in the source MIME.
  const longUrl = trimmed.match(/https?:\/\/\S{250,}/);
  if (longUrl) {
    const beforeUrl = trimmed.slice(0, trimmed.indexOf(longUrl[0])).trim();
    const wordsBefore = beforeUrl.split(/\s+/).filter((w) => w.length > 1);
    if (wordsBefore.length <= 3) return true;
  }

  // 3. Pure base64-style blob — long string of mostly token chars,
  // no spaces, no normal sentence punctuation. Catches encoded
  // campaign-id dumps.
  if (trimmed.length > 100 && !/\s/.test(trimmed)) {
    const alnumRatio = (trimmed.match(/[A-Za-z0-9_+/=%-]/g) ?? []).length / trimmed.length;
    if (alnumRatio > 0.95 && !trimmed.startsWith("http")) return true;
  }

  return false;
}

export function cleanEmailBody(raw: string): string {
  if (!raw) return "";

  // 1. Normalize NBSP → regular space.
  const text = raw.replace(/ /g, " ");

  // 2. Line-by-line filter.
  const cleanedLines = text.split("\n").filter((line) => !isArtefactLine(line));

  // 3. Collapse 3+ consecutive blank lines into a single blank line
  // (artefact removal often leaves orphan blank gaps).
  return cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
