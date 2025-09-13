export interface Dialogue {
  type: "dialogue";
  character: string;
  text: string;
}

export interface Direction {
  type: "direction";
  text: string;
}

export type ScenePart = Dialogue | Direction;

export interface Scene {
  heading: string;
  number?: string;
  parts: ScenePart[];
  characters: string[];
  setting: string;
  location: string;
  time: string;
}

export interface CharacterStats {
  name: string;
  sceneCount: number;
  dialogueCount: number;
  scenes: number[];
}

const HEADING_REGEX = /^(\s*)(\d+\.?\s*)?(INT\.\/EXT\.|EXT\/INT\.|INT\/EXT|EXT\/INT|INT\.|EXT\.)\s*(.*)$/i;
const CHAR_LINE_REGEX = /^\s{0,20}([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9\s'().-]+)$/;
const STOP_WORDS = new Set(["INT", "EXT", "CUT", "FADE", "DAY", "NIGHT", "TO", "THE", "A", "AN", "AND"]);

export function cleanName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function parseScript(text: string): {
  scenes: Scene[];
  characters: CharacterStats[];
} {
  const scenes: Scene[] = [];
  const charStats = new Map<string, { scenes: Set<number>; dialogueCount: number }>();

  let current: Scene | null = null;
  let currentDialogue: Dialogue | null = null;
  let sceneCharacters: Set<string> = new Set();

  function pushCurrentDialogue() {
    if (!current || !currentDialogue) return;
    if (currentDialogue.text.trim()) {
      sceneCharacters.add(currentDialogue.character);
      const stat = charStats.get(currentDialogue.character) || {
        scenes: new Set<number>(),
        dialogueCount: 0,
      };
      stat.dialogueCount += 1;
      charStats.set(currentDialogue.character, stat);
      current.parts.push(currentDialogue);
    } else {
      current.parts.push({ type: "direction", text: currentDialogue.character });
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
        const sceneIndex = scenes.length;
        const sceneNumber =
          current.number && !isNaN(parseInt(current.number, 10)) ? parseInt(current.number, 10) : sceneIndex;
        for (const name of Array.from(sceneCharacters)) {
          const stat = charStats.get(name) || {
            scenes: new Set<number>(),
            dialogueCount: 0,
          };
          stat.scenes.add(sceneNumber);
          charStats.set(name, stat);
        }
      }
      const number = headingMatch[2]?.trim().replace(/\.$/, "") || undefined;
      const setting = headingMatch[3].replace(/\.$/, "").toUpperCase();
      const afterSetting = headingMatch[4].trim();
      let location = afterSetting;
      let time = "";
      const dashIdx = afterSetting.lastIndexOf(" - ");
      if (dashIdx !== -1) {
        location = afterSetting.slice(0, dashIdx).trim();
        time = afterSetting.slice(dashIdx + 3).trim();
      }
      const heading = `${headingMatch[3]} ${afterSetting}`.trim();
      current = {
        heading,
        number,
        parts: [],
        characters: [],
        setting,
        location,
        time,
      };
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
        currentDialogue = { type: "dialogue", character: name, text: "" };
      }
      continue;
    }

    if (currentDialogue) {
      currentDialogue.text += (currentDialogue.text ? "\n" : "") + trimmed;
      continue;
    }

    current.parts.push({ type: "direction", text: trimmed });
    if (/CUT TO(\s|:)/i.test(trimmed)) {
      continue;
    }
    const caps =
      trimmed.match(/[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9'.-]*(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9'.-]*)*/g) ||
      [];
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
    const sceneIndex = scenes.length;
    const sceneNumber =
      current.number && !isNaN(parseInt(current.number, 10)) ? parseInt(current.number, 10) : sceneIndex;
    for (const name of Array.from(sceneCharacters)) {
      const stat = charStats.get(name) || { scenes: new Set<number>(), dialogueCount: 0 };
      stat.scenes.add(sceneNumber);
      charStats.set(name, stat);
    }
  }
  const characters: CharacterStats[] = Array.from(charStats.entries())
    .map(([name, stat]) => ({
      name,
      sceneCount: stat.scenes.size,
      dialogueCount: stat.dialogueCount,
      scenes: Array.from(stat.scenes).sort((a, b) => a - b),
    }))
    .filter((c) => !c.name.includes("CUT TO"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const charSet = new Set(characters.map((c) => c.name));
  for (const scene of scenes) {
    scene.characters = scene.characters.filter((c) => charSet.has(c));
  }

  return { scenes, characters };
}
