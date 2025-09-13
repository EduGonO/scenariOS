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
const sceneStore: Scene[] = [];

export const getServer = (): McpServer => {
  const server = new McpServer(
    { name: "scenarios-server", version: "0.1.0" },
    { capabilities: {} },
  );

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
      sceneStore.push(scene);
      return { content: [{ type: "text", text: JSON.stringify(scene) }] };
    },
  );

  const findShape = {
    sceneNumber: z.string().optional(),
    characters: z.array(z.string()).optional(),
    setting: z.string().optional(),
    location: z.string().optional(),
    time: z.string().optional(),
  };
  const findSchema = z.object(findShape);
  type FindParams = z.infer<typeof findSchema>;

  function filterScenes({ sceneNumber, characters, setting, location, time }: FindParams) {
    const chars = characters?.map((c) => c.toUpperCase());
    return sceneStore.filter(
      (s) =>
        (!sceneNumber || s.id === sceneNumber) &&
        (!setting || s.setting.toLowerCase() === setting.toLowerCase()) &&
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

  server.tool(
    "find",
    "Find scenes by number or attributes",
    findShape,
    async (params: FindParams): Promise<CallToolResult> => {
      const parsed = findSchema.parse(params);
      const results = filterScenes(parsed);
      return { content: [{ type: "text", text: JSON.stringify(results) }] };
    },
  );

  server.tool(
    "print",
    "Print scenes in formatted markdown",
    findShape,
    async (params: FindParams): Promise<CallToolResult> => {
      const parsed = findSchema.parse(params);
      const results = filterScenes(parsed);
      const formatted = results.map(formatScene).join("\n\n");
      return { content: [{ type: "text", text: formatted }] };
    },
  );

  return server;
};

