import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { parseScript } from "../utils/parseScript";
import type { Scene as ParsedScene, ScenePart } from "../utils/parseScript";

const SceneInfo = z.object({
  setting: z.string(),
  location: z.string(),
  time: z.string(),
  characters: z.array(z.string()).default([]),
});

type Scene = z.infer<typeof SceneInfo> & { id: string; raw: string };

// Persist scenes across hot-reloads or separate imports by attaching the store
// to the global object. This helps keep scenes registered even after navigating
// between pages which can cause the module to be re-evaluated.
const g = globalThis as any;
g.__scenariOSSceneStore = g.__scenariOSSceneStore || [];
const sceneStore: Scene[] = g.__scenariOSSceneStore as Scene[];

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(str: string): string {
  return stripDiacritics(str).toLowerCase();
}

function normalizeName(str: string): string {
  return stripDiacritics(str).toUpperCase();
}

async function translateToEnglish(text?: string): Promise<string | undefined> {
  if (!text) return text;
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return text;
  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "system",
            content:
              "You are a translator. Translate the user text to English and reply with ONLY the translated text without quotes or additional commentary.",
          },
          { role: "user", content: text },
        ],
      }),
    });
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content?.trim();
    return out ? out.split(/\r?\n/)[0].trim() : text;
  } catch {
    return text;
  }
}

export const getServer = (): McpServer => {
  const server = new McpServer({ name: "scenarios-server", version: "0.1.0" }, { capabilities: {} });

  server.tool(
    "parse_scene",
    "Store scene metadata",
    {
      id: z.string().describe("Unique scene id"),
      text: z.string().optional().describe("Raw scene text"),
      setting: z.string().optional(),
      location: z.string().optional(),
      time: z.string().optional(),
      characters: z.array(z.string()).optional(),
    },
    async ({ id, text, setting, location, time, characters }): Promise<CallToolResult> => {
      let meta: z.infer<typeof SceneInfo>;
      let raw = text || "";
      if (!setting || !location || !time) {
        if (!text) throw new Error("text required when metadata missing");
        const parsed = parseScript(text);
        const first = parsed.scenes[0];
        if (!first) throw new Error("unable to parse scene");
        meta = {
          setting: first.setting,
          location: first.location,
          time: first.time,
          characters: first.characters,
        };
      } else {
        meta = {
          setting,
          location,
          time,
          characters: characters?.map((c) => c.toUpperCase()) || [],
        };
      }
      const scene: Scene = {
        id,
        raw,
        ...meta,
        characters: meta.characters.map((c) => c.toUpperCase()),
      };
      const existingIndex = sceneStore.findIndex((s) => s.id === id);
      if (existingIndex !== -1) sceneStore.splice(existingIndex, 1);
      sceneStore.push(scene);
      return { content: [{ type: "text", text: JSON.stringify(scene) }] };
    },
  );

  server.tool(
    "parse_pdf",
    "Parse full script text and store scenes",
    {
      text: z.string().describe("Full script text from PDF"),
    },
    async ({ text }): Promise<CallToolResult> => {
      const parsed = parseScript(text);
      sceneStore.length = 0;
      for (const sc of parsed.scenes as ParsedScene[]) {
        const rawParts = sc.parts.map((p: ScenePart) =>
          p.type === "dialogue" ? `${p.character}\n${p.text}` : p.text,
        );
        const scene: Scene = {
          id: sc.sceneNumber.toString(),
          raw: [sc.heading, ...rawParts].join("\n"),
          setting: sc.setting,
          location: sc.location,
          time: sc.time,
          characters: sc.characters,
        };
        sceneStore.push(scene);
      }
      return { content: [{ type: "text", text: `Parsed ${parsed.scenes.length} scenes` }] };
    },
  );

  const findShape = {
    sceneNumber: z.union([z.string(), z.number()]).optional(),
    characters: z.union([z.string(), z.array(z.string())]).optional(),
    setting: z.string().optional(),
    location: z.string().optional(),
    time: z.string().optional(),
  };
  const findSchema = z.object(findShape);

  type FindParams = {
    sceneNumber?: string;
    characters?: string[];
    setting?: string;
    location?: string;
    time?: string;
  };

  const TIME_SYNONYMS: Record<string, string[]> = {
    night: ["night", "noche", "nuit", "notte"],
    day: ["day", "dia", "día", "jour"],
    dawn: ["dawn", "amanecer", "aurore"],
    dusk: ["dusk", "crepúsculo", "crepusculo", "crépuscule"],
    evening: ["evening", "soir", "tarde"],
    morning: ["morning", "mañana", "matin"],
    afternoon: ["afternoon", "tarde", "aprèm", "apres-midi"],
  };

  async function normalizeParams(
    raw: z.infer<typeof findSchema>,
    translate = false,
  ): Promise<FindParams> {
    let { sceneNumber, characters, setting, location, time } = raw;

    if (typeof characters === "string") {
      const list = characters
        .split(/[,/&]|\band\b/i)
        .map((c) => c.trim())
        .filter(Boolean);
      if (translate) {
        const translated = await Promise.all(list.map((c) => translateToEnglish(c)));
        characters = translated.filter((c): c is string => Boolean(c));
      } else {
        characters = list;
      }
    } else if (Array.isArray(characters)) {
      if (translate) {
        const translated = await Promise.all(characters.map((c) => translateToEnglish(c)));
        characters = translated.filter((c): c is string => Boolean(c));
      }
    }

    if (translate) {
      [setting, location, time] = await Promise.all([
        translateToEnglish(setting),
        translateToEnglish(location),
        translateToEnglish(time),
      ]);
    }

    if (typeof sceneNumber === "number") sceneNumber = sceneNumber.toString();

    if (setting) {
      let s = setting;
      for (const [canonical, words] of Object.entries(TIME_SYNONYMS)) {
        const re = new RegExp(`\\b(${words.map((w) => stripDiacritics(w)).join("|")})\\b`, "i");
        if (re.test(stripDiacritics(s))) {
          time = time && !normalizeText(time).includes(canonical) ? `${time} ${canonical}` : time || canonical;
          s = s.replace(re, "").trim();
        }
      }
      setting = s || undefined;
    }

    const chars = Array.isArray(characters) && characters.length ? (characters as string[]) : undefined;
    return { sceneNumber, characters: chars, setting, location, time };
  }

  function normalizeSettingTokens(value: string): string[] {
    const lower = normalizeText(value);
    const tokens: string[] = [];
    if (/(^|\/|\b)(int|interior|inside|interieur|adentro)(\/|\b|$)/.test(lower)) tokens.push("int");
    if (/(^|\/|\b)(ext|exterior|outside|exterieur|afuera)(\/|\b|$)/.test(lower)) tokens.push("ext");
    return tokens.length ? tokens : [lower];
  }

  function matchesSetting(sceneSetting: string, query: string) {
    const sceneTokens = normalizeSettingTokens(sceneSetting);
    const queryTokens = normalizeSettingTokens(query);
    return queryTokens.every((t) => sceneTokens.includes(t));
  }

  function filterScenes({ sceneNumber, characters, setting, location, time }: FindParams) {
    const chars = characters?.map((c) => normalizeName(c));
    return sceneStore.filter(
      (s) =>
        (!sceneNumber || s.id === sceneNumber) &&
        (!setting || matchesSetting(s.setting, setting)) &&
        (!location || normalizeText(s.location).includes(normalizeText(location))) &&
        (!time || normalizeText(s.time).includes(normalizeText(time))) &&
        (!chars || chars.every((c) => s.characters.some((sc) => normalizeName(sc) === c))),
    );
  }

  function formatScene(scene: Scene) {
    const heading = `**${scene.id}.** \`${scene.setting}.\` ${scene.location} - ${scene.time}`;
    let lines = scene.raw.split(/\r?\n/);
    if (/^\s*(INT|EXT)\./i.test(lines[0])) {
      lines = lines.slice(1);
    }
    let body = lines.join("\n").trim();
    for (const char of scene.characters) {
      const regex = new RegExp(`\\b${char}\\b`, "gi");
      body = body.replace(regex, `**${char.toUpperCase()}**`);
    }
    if (body) body += "\n";
    return `${heading}\n${body}`;
  }

  function buildNoResultsMessage({ sceneNumber, characters, setting, location, time }: FindParams) {
    const parts: string[] = [];
    if (characters?.length) parts.push(`with ${characters.join(" and ")}`);
    if (setting) parts.push(`in ${setting}`);
    if (time) parts.push(`at ${time}`);
    if (location) parts.push(`in ${location}`);
    if (sceneNumber) parts.push(`number ${sceneNumber}`);
    return `There are no scenes ${parts.join(" ")}`.replace(/\s+/g, " ").trim();
  }

  server.tool(
    "find",
    "Find scenes by number or attributes",
    findShape,
    async (params): Promise<CallToolResult> => {
      const raw = findSchema.parse(params);
      let parsed = await normalizeParams(raw);
      let results = filterScenes(parsed);
      if (!results.length) {
        parsed = await normalizeParams(raw, true);
        results = filterScenes(parsed);
      }
      if (!results.length)
        return {
          content: [
            { type: "text", text: JSON.stringify([]) },
            { type: "text", text: buildNoResultsMessage(parsed) },
          ],
        };
      return { content: [{ type: "text", text: JSON.stringify(results) }] };
    },
  );

  server.tool(
    "print",
    "Print scenes in formatted markdown",
    findShape,
    async (params): Promise<CallToolResult> => {
      const raw = findSchema.parse(params);
      let parsed = await normalizeParams(raw);
      let results = filterScenes(parsed);
      if (!results.length) {
        parsed = await normalizeParams(raw, true);
        results = filterScenes(parsed);
      }
      if (!results.length)
        return { content: [{ type: "text", text: buildNoResultsMessage(parsed) }] };
      const formatted = results.map(formatScene).join("\n\n");
      return { content: [{ type: "text", text: formatted }] };
    },
  );

  server.tool(
    "count",
    "Count scenes matching attributes",
    findShape,
    async (params): Promise<CallToolResult> => {
      const raw = findSchema.parse(params);
      let parsed = await normalizeParams(raw);
      let results = filterScenes(parsed);
      if (!results.length) {
        parsed = await normalizeParams(raw, true);
        results = filterScenes(parsed);
      }
      if (!results.length) return { content: [{ type: "text", text: buildNoResultsMessage(parsed) }] };
      return { content: [{ type: "text", text: results.length.toString() }] };
    },
  );

  return server;
};
