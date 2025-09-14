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
  sceneDuration: z.number().int().optional(),
  shootingDates: z.array(z.string()).default([]),
  shootingLocations: z.array(z.string()).default([]),
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

async function estimateDuration(text: string): Promise<number> {
  const fallback = Math.round(text.split(/\s+/).length / 3);
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return fallback;
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
              "Estimate the approximate screen time in seconds for the following film scene, taking into account dialogue and action descriptions. Reply with ONLY a number.",
          },
          { role: "user", content: text },
        ],
      }),
    });
    const data = await res.json();
    const out = parseInt(data?.choices?.[0]?.message?.content?.trim(), 10);
    return Number.isFinite(out) ? out : fallback;
  } catch {
    return fallback;
  }
}

async function guessLocations(prompt: string): Promise<string[]> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Suggest concise real-world filming locations based on the scene heading and description. Return a JSON object {locations: [string, ...]}.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed.locations)
      ? parsed.locations.map((l: string) => l.trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function buildDurationPrompt(scene: ParsedScene): string {
  const body = scene.parts
    .map((p: ScenePart) => (p.type === "dialogue" ? `${p.character}: ${p.text}` : p.text))
    .join("\n");
  return `${scene.heading}\n${body}`;
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
      sceneDuration: z.number().optional(),
      shootingDates: z.array(z.string()).optional(),
      shootingLocations: z.array(z.string()).optional(),
    },
    async ({
      id,
      text,
      setting,
      location,
      time,
      characters,
      sceneDuration,
      shootingDates,
      shootingLocations,
    }): Promise<CallToolResult> => {
      let meta: z.infer<typeof SceneInfo>;
      let parsedScene: ParsedScene | undefined;
      if (!setting || !location || !time) {
        if (!text) throw new Error("text required when metadata missing");
        const parsed = parseScript(text);
        parsedScene = parsed.scenes[0];
        if (!parsedScene) throw new Error("unable to parse scene");
        meta = {
          setting: parsedScene.setting,
          location: parsedScene.location,
          time: parsedScene.time,
          characters: parsedScene.characters,
          sceneDuration: undefined,
          shootingDates: [],
          shootingLocations: [],
        };
      } else {
        meta = {
          setting,
          location,
          time,
          characters: characters?.map((c) => c.toUpperCase()) || [],
          sceneDuration: undefined,
          shootingDates: [],
          shootingLocations: [],
        };
        if (text) {
          const parsed = parseScript(text);
          parsedScene = parsed.scenes[0];
        }
      }
      const raw = text || (parsedScene ? buildDurationPrompt(parsedScene) : "");
      const durationPrompt = parsedScene ? buildDurationPrompt(parsedScene) : raw;
      const duration = sceneDuration ?? (durationPrompt ? await estimateDuration(durationPrompt) : undefined);
      const locationsGuess =
        shootingLocations && shootingLocations.length
          ? shootingLocations
          : raw
          ? await guessLocations(raw)
          : [];
      const scene: Scene = {
        id,
        raw,
        ...meta,
        characters: meta.characters.map((c) => c.toUpperCase()),
        sceneDuration: duration,
        shootingDates: shootingDates ?? [],
        shootingLocations: locationsGuess,
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
        const prompt = buildDurationPrompt(sc);
        const scene: Scene = {
          id: sc.sceneNumber.toString(),
          raw: prompt,
          setting: sc.setting,
          location: sc.location,
          time: sc.time,
          characters: sc.characters,
          sceneDuration: await estimateDuration(prompt),
          shootingDates: [],
          shootingLocations: await guessLocations(prompt),
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
    sceneDuration: z.union([z.string(), z.number()]).optional(),
    shootingDate: z.string().optional(),
    shootingLocation: z.string().optional(),
  };
  const findSchema = z.object(findShape);

  type FindParams = {
    sceneNumber?: string;
    characters?: string[];
    setting?: string;
    location?: string;
    time?: string;
    sceneDuration?: number;
    shootingDate?: string;
    shootingLocation?: string;
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
    let {
      sceneNumber,
      characters,
      setting,
      location,
      time,
      sceneDuration,
      shootingDate,
      shootingLocation,
    } = raw;

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
      [setting, location, time, shootingLocation] = await Promise.all([
        translateToEnglish(setting),
        translateToEnglish(location),
        translateToEnglish(time),
        translateToEnglish(shootingLocation),
      ]);
    }

    if (typeof sceneNumber === "number") sceneNumber = sceneNumber.toString();
    if (typeof sceneDuration === "string") sceneDuration = parseInt(sceneDuration, 10);

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
    return {
      sceneNumber,
      characters: chars,
      setting,
      location,
      time,
      sceneDuration: typeof sceneDuration === "number" && !isNaN(sceneDuration) ? sceneDuration : undefined,
      shootingDate,
      shootingLocation,
    };
  }

  async function promptToParams(prompt: string): Promise<FindParams> {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) return {};
    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Extract film scene search filters from the user request. Return a JSON object with optional keys: sceneNumber, characters, setting, location, time, sceneDuration, shootingDate, shootingLocation. characters must be an array of names.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) return {};
      const raw = JSON.parse(text);
      const parsed = findSchema.safeParse(raw);
      if (!parsed.success) return {};
      return await normalizeParams(parsed.data, true);
    } catch {
      return {};
    }
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

  function filterScenes({
    sceneNumber,
    characters,
    setting,
    location,
    time,
    sceneDuration,
    shootingDate,
    shootingLocation,
  }: FindParams) {
    const chars = characters?.map((c) => normalizeName(c));
    return sceneStore.filter(
      (s) =>
        (!sceneNumber || s.id === sceneNumber) &&
        (!setting || matchesSetting(s.setting, setting)) &&
        (!location || normalizeText(s.location).includes(normalizeText(location))) &&
        (!time || normalizeText(s.time).includes(normalizeText(time))) &&
        (!chars || chars.every((c) => s.characters.some((sc) => normalizeName(sc) === c))) &&
        (!sceneDuration || s.sceneDuration === sceneDuration) &&
        (!shootingDate || s.shootingDates.includes(shootingDate)) &&
        (!shootingLocation ||
          s.shootingLocations.some((loc) =>
            normalizeText(loc).includes(normalizeText(shootingLocation || "")),
          )),
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
    const meta: string[] = [];
    if (scene.sceneDuration) meta.push(`Duration: ${scene.sceneDuration}s`);
    if (scene.shootingDates.length) meta.push(`Dates: ${scene.shootingDates.join(", ")}`);
    if (scene.shootingLocations.length)
      meta.push(`Locations: ${scene.shootingLocations.join(", ")}`);
    if (meta.length) body += (body ? "\n" : "") + meta.join(" | ");
    if (body) body += "\n";
    return `${heading}\n${body}`;
  }

  function buildNoResultsMessage({
    sceneNumber,
    characters,
    setting,
    location,
    time,
    sceneDuration,
    shootingDate,
    shootingLocation,
  }: FindParams) {
    const parts: string[] = [];
    if (characters?.length) parts.push(`with ${characters.join(" and ")}`);
    if (setting) parts.push(`in ${setting}`);
    if (time) parts.push(`at ${time}`);
    if (location) parts.push(`in ${location}`);
    if (shootingLocation) parts.push(`shot at ${shootingLocation}`);
    if (shootingDate) parts.push(`on ${shootingDate}`);
    if (sceneDuration) parts.push(`lasting ${sceneDuration}s`);
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
    "query_scenes",
    "Find and print scenes using a natural language prompt",
    { prompt: z.string().describe("Natural language description of desired scenes") },
    async ({ prompt }): Promise<CallToolResult> => {
      const parsed = await promptToParams(prompt);
      const results = filterScenes(parsed);
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

  server.tool(
    "calendar_suggest",
    "Suggest shooting dates",
    { id: z.string(), time: z.string().optional() },
    async ({ id, time }): Promise<CallToolResult> => {
      const now = new Date();
      const dates: string[] = [];
      for (let i = 1; i <= 14; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const hrs = time && /NIGHT/i.test(time) ? 20 : 9;
        d.setHours(hrs, 0, 0, 0);
        dates.push(d.toISOString().split("T")[0]);
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ dates: dates.slice(0, 10) }) }],
      };
    },
  );

  server.tool(
    "map_search",
    "Search map location with backups",
    { query: z.string() },
    async ({ query }): Promise<CallToolResult> => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query,
      )}`;
      try {
        const res = await fetch(url, { headers: { "User-Agent": "scenariOS" } });
        const data = await res.json();
        const primary = data[0];
        const backups = data.slice(1, 4);
        const out = {
          primary: primary
            ? {
                name: primary.display_name,
                lat: Number(primary.lat),
                lon: Number(primary.lon),
              }
            : undefined,
          backups: backups.map((b: any) => ({
            name: b.display_name,
            lat: Number(b.lat),
            lon: Number(b.lon),
          })),
        };
        return { content: [{ type: "text", text: JSON.stringify(out) }] };
      } catch {
        return { content: [{ type: "text", text: JSON.stringify({}) }] };
      }
    },
  );

  server.tool(
    "weather_forecast",
    "Get weather forecast for location/date",
    { lat: z.number(), lon: z.number(), date: z.string() },
    async ({ lat, lon, date }): Promise<CallToolResult> => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&start_date=${date}&end_date=${date}`;
        const res = await fetch(url);
        const data = await res.json();
        const out = {
          max: data?.daily?.temperature_2m_max?.[0],
          min: data?.daily?.temperature_2m_min?.[0],
          code: data?.daily?.weathercode?.[0],
        };
        return { content: [{ type: "text", text: JSON.stringify(out) }] };
      } catch {
        return { content: [{ type: "text", text: JSON.stringify({}) }] };
      }
    },
  );

  return server;
};
