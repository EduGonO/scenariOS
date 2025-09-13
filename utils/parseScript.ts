export interface Scene {
  heading: string;
  number?: string;
  lines: string[];
}

const HEADING_REGEX = /^\s*(\d+\.?\s*)?(INT\.\/EXT\.|EXT\/INT\.|INT\/EXT|EXT\/INT|INT\.|EXT\.)\s*(.*)$/i;

export function parseScript(text: string): Scene[] {
  const scenes: Scene[] = [];
  let current: Scene | null = null;
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(HEADING_REGEX);
    if (match) {
      if (current) scenes.push(current);
      const number = match[1]?.trim().replace(/\.$/, '') || undefined;
      const heading = `${match[2]} ${match[3].trim()}`.trim();
      current = { heading, number, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) scenes.push(current);
  return scenes;
}
