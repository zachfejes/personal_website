export interface TextSegment {
  text: string;
  accent: boolean;
}

/** Split copy like "Motivated by *wonder*," into plain and accent segments. */
export function parseAccent(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const re = /\*(.+?)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), accent: false });
    segments.push({ text: m[1], accent: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), accent: false });
  return segments;
}

/** Headline copy uses "|" to mark line breaks: "Line one | line two". */
export function parseHeadline(text: string): TextSegment[][] {
  return text
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseAccent);
}
