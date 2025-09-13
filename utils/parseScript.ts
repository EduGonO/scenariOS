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
  sceneNumber: number;
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
const STOP_WORDS = new Set([
  "INT",
  "EXT",
  "CUT",
  "FADE",
  "DAY",
  "NIGHT",
  "TO",
  "THE",
  "A",
  "AN",
  "AND",
  "LA",
  "EL",
  "LOS",
  "LAS",
  "DE",
  "DEL",
  "AL",
  "UN",
  "UNA",
  "UNOS",
  "UNAS",
  "Y",
  "O",
  "CON",
  "POR",
  "PARA",
  "EN",
  "SE",
  "SU",
]);

export function cleanName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseScript(text: string): {
  scenes: Scene[];
  characters: CharacterStats[];
} {
  const scenes: Scene[] = [];
  const charStats = new Map<string, { scenes: Set<number>; dialogueCount: number }>();

  let current: Scene | null = null;
  let currentDialogue: Dialogue | null = null;
  let currentDirection: string[] = [];
  let sceneCharacters: Set<string> = new Set();

  function pushCurrentDialogue() {
    if (!current || !currentDialogue) return;
    currentDialogue.text = currentDialogue.text.trim();
    if (currentDialogue.text) {
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

  function pushCurrentDirection() {
    if (!current || !currentDirection.length) return;
    const text = currentDirection.join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      current.parts.push({ type: "direction", text });
      const caps =
        text.match(/\b[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-ß0-9'()]*\b(?:\s+\b[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-ß0-9'()]*\b)*/g) || [];
      for (const word of caps) {
        const name = cleanName(word.trim());
        if (!STOP_WORDS.has(name) && name.length > 1) {
          sceneCharacters.add(name);
        }
      }
    }
    currentDirection = [];
  }

  function finalizeScene() {
    if (!current) return;
    pushCurrentDialogue();
    pushCurrentDirection();
    current.characters = Array.from(sceneCharacters);
    scenes.push(current);
    for (const name of current.characters) {
      const stat = charStats.get(name) || { scenes: new Set<number>(), dialogueCount: 0 };
      stat.scenes.add(current.sceneNumber);
      charStats.set(name, stat);
    }
  }

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(HEADING_REGEX);

    if (headingMatch) {
      finalizeScene();
      let afterSetting = headingMatch[4].trim();
      const trailing = afterSetting.match(/(.*?)(\d+)$/);
      if (trailing) {
        afterSetting = trailing[1].trim();
      }
      const setting = headingMatch[3].replace(/\.$/, "").toUpperCase();
      let location = afterSetting;
      let time = "";
      const dashIdx = afterSetting.lastIndexOf(" - ");
      if (dashIdx !== -1) {
        location = afterSetting.slice(0, dashIdx).trim();
        time = afterSetting.slice(dashIdx + 3).trim();
      }
      const headingText = `${headingMatch[3]} ${afterSetting}`.trim();
      const sceneNumber = scenes.length + 1;
      current = {
        heading: headingText,
        sceneNumber,
        parts: [],
        characters: [],
        setting,
        location,
        time,
      };
      currentDialogue = null;
      currentDirection = [];
      sceneCharacters = new Set();
      continue;
    }

    if (!current) continue;

    const trimmed = line.trim();

    if (!trimmed) {
      pushCurrentDialogue();
      pushCurrentDirection();
      continue;
    }

    const charMatch = trimmed.match(CHAR_LINE_REGEX);
    if (charMatch && trimmed === trimmed.toUpperCase()) {
      pushCurrentDialogue();
      pushCurrentDirection();
      const name = cleanName(charMatch[1].trim());
      if (name) {
        currentDialogue = { type: "dialogue", character: name, text: "" };
      }
      continue;
    }

    if (currentDialogue) {
      currentDialogue.text += (currentDialogue.text ? " " : "") + trimmed;
      continue;
    }

    currentDirection.push(trimmed);
  }

  finalizeScene();

  const characters: CharacterStats[] = Array.from(charStats.entries())
    .map(([name, stat]) => ({
      name,
      sceneCount: stat.scenes.size,
      dialogueCount: stat.dialogueCount,
      scenes: Array.from(stat.scenes).sort((a, b) => a - b),
    }))
    .filter((c) => c.dialogueCount > 0 && !c.name.includes("CUT TO"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const charSet = new Set(characters.map((c) => c.name));
  const namePattern = Array.from(charSet)
    .sort((a, b) => b.length - a.length)
    .map((n) => escapeRegExp(n))
    .join("|");
  const nameRegex = namePattern ? new RegExp(`\b(${namePattern})\b`, "gi") : null;
  for (const scene of scenes) {
    for (const part of scene.parts) {
      if (!nameRegex) continue;
      if (part.type === "direction") {
        part.text = part.text.replace(nameRegex, (m) => cleanName(m));
      } else if (part.type === "dialogue") {
        part.text = part.text.replace(nameRegex, (m) => cleanName(m));
      }
    }
    scene.characters = scene.characters.filter((c) => charSet.has(c));
  }

  return { scenes, characters };
}
