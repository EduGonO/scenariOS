import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { parseScript } from "../utils/parseScript";

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

  const TIME_WORDS = ["night", "day", "dawn", "dusk", "evening", "morning", "afternoon"];

  function normalizeParams(raw: z.infer<typeof findSchema>): FindParams {
    let { sceneNumber, characters, setting, location, time } = raw;

    if (typeof sceneNumber === "number") sceneNumber = sceneNumber.toString();

    if (typeof characters === "string") {
      characters = characters
        .split(/[,/&]|\band\b/i)
        .map((c) => c.trim())
        .filter(Boolean);
    }

    if (setting) {
      let s = setting;
      for (const word of TIME_WORDS) {
        const re = new RegExp(`\\b${word}\\b`, "i");
        if (re.test(s)) {
          time = time && !time.toLowerCase().includes(word) ? `${time} ${word}` : time || word;
          s = s.replace(re, "").trim();
        }
      }
      setting = s || undefined;
    }

    return { sceneNumber, characters, setting, location, time };
  }

  function normalizeSettingTokens(value: string): string[] {
    const lower = value.toLowerCase();
    const tokens: string[] = [];
    if (/(^|\/|\b)(int|interior|inside)(\/|\b|$)/.test(lower)) tokens.push("int");
    if (/(^|\/|\b)(ext|exterior|outside)(\/|\b|$)/.test(lower)) tokens.push("ext");
    return tokens.length ? tokens : [lower];
  }

  function matchesSetting(sceneSetting: string, query: string) {
    const sceneTokens = normalizeSettingTokens(sceneSetting);
    const queryTokens = normalizeSettingTokens(query);
    return queryTokens.every((t) => sceneTokens.includes(t));
  }

  function filterScenes({ sceneNumber, characters, setting, location, time }: FindParams) {
    const chars = characters?.map((c) => c.toUpperCase());
    return sceneStore.filter(
      (s) =>
        (!sceneNumber || s.id === sceneNumber) &&
        (!setting || matchesSetting(s.setting, setting)) &&
        (!location || s.location.toLowerCase().includes(location.toLowerCase())) &&
        (!time || s.time.toLowerCase().includes(time.toLowerCase())) &&
        (!chars || chars.every((c) => s.characters.includes(c))),
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

  server.tool("find", "Find scenes by number or attributes", findShape, async (params): Promise<CallToolResult> => {
    const parsed = normalizeParams(findSchema.parse(params));
    const results = filterScenes(parsed);
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  });

  server.tool("print", "Print scenes in formatted markdown", findShape, async (params): Promise<CallToolResult> => {
    const parsed = normalizeParams(findSchema.parse(params));
    const results = filterScenes(parsed);
    const formatted = results.map(formatScene).join("\n\n");
    return { content: [{ type: "text", text: formatted }] };
  });

  return server;
};
