export interface Dialogue {
  type: 'dialogue';
  character: string;
  text: string;
}

export interface Direction {
  type: 'direction';
  text: string;
}

export type ScenePart = Dialogue | Direction;

export interface Scene {
  heading: string;
  number?: string;
  parts: ScenePart[];
  characters: string[];
}

const HEADING_REGEX = /^(\s*)(\d+\.?\s*)?(INT\.\/EXT\.|EXT\/INT\.|INT\/EXT|EXT\/INT|INT\.|EXT\.)\s*(.*)$/i;
const CHAR_LINE_REGEX = /^\s{0,20}([A-Z][A-Z0-9\s'().-]+)$/;
const STOP_WORDS = new Set(['INT', 'EXT', 'CUT', 'FADE', 'DAY', 'NIGHT', 'TO', 'THE', 'A', 'AN', 'AND']);

export function cleanName(raw: string): string {
  return raw
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseScript(text: string): {
  scenes: Scene[];
  characters: string[];
} {
  const scenes: Scene[] = [];
  const dialogueCounts = new Map<string, number>();

  let current: Scene | null = null;
  let currentDialogue: Dialogue | null = null;
  let sceneCharacters: Set<string> = new Set();

  function pushCurrentDialogue() {
    if (!current || !currentDialogue) return;
    if (currentDialogue.text.trim()) {
      sceneCharacters.add(currentDialogue.character);
      const count = dialogueCounts.get(currentDialogue.character) || 0;
      dialogueCounts.set(currentDialogue.character, count + 1);
      current.parts.push(currentDialogue);
    } else {
      current.parts.push({ type: 'direction', text: currentDialogue.character });
    }
    currentDialogue = null;
  }

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(HEADING_REGEX);

    if (headingMatch) {
      if (current) {
        pushCurrentDialogue();
        current.characters = Array.from(sceneCharacters);
        scenes.push(current);
      }
      const number = headingMatch[2]?.trim().replace(/\.$/, '') || undefined;
      const heading = `${headingMatch[3]} ${headingMatch[4].trim()}`.trim();
      current = { heading, number, parts: [], characters: [] };
      currentDialogue = null;
      sceneCharacters = new Set();
      continue;
    }

    if (!current) continue;

    const trimmed = line.trim();

    if (!trimmed) {
      pushCurrentDialogue();
      continue;
    }

    const charMatch = trimmed.match(CHAR_LINE_REGEX);
    if (charMatch && trimmed === trimmed.toUpperCase()) {
      pushCurrentDialogue();
      const name = cleanName(charMatch[1].trim());
      if (name) {
        currentDialogue = { type: 'dialogue', character: name, text: '' };
      }
      continue;
    }

    if (currentDialogue) {
      currentDialogue.text += (currentDialogue.text ? '\n' : '') + trimmed;
      continue;
    }

    current.parts.push({ type: 'direction', text: trimmed });
    const caps = trimmed.match(/[A-Z][A-Z0-9]+(?:\s+[A-Z][A-Z0-9]+)*/g) || [];
    for (const word of caps) {
      const name = cleanName(word.trim());
      if (!STOP_WORDS.has(name) && name.length > 1) {
        sceneCharacters.add(name);
      }
    }
  }

  if (current) {
    pushCurrentDialogue();
    current.characters = Array.from(sceneCharacters);
    scenes.push(current);
  }

  const characters = Array.from(dialogueCounts.keys()).sort();
  const charSet = new Set(characters);
  for (const scene of scenes) {
    scene.characters = scene.characters.filter((c) => charSet.has(c));
  }

  return { scenes, characters };
}

