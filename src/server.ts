import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const SceneInfo = z.object({
  setting: z.enum(["INT", "EXT"]),
  location: z.string(),
  time: z.string(),
  characters: z.array(z.string()).default([]),
});

type Scene = z.infer<typeof SceneInfo> & { id: string; raw: string };
const sceneStore: Scene[] = [];

async function parseWithMistral(text: string) {
  const apiKey = process.env["MISTRAL_API_KEY"];
  if (!apiKey) throw new Error("MISTRAL_API_KEY not set");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content:
            `Extract scene metadata as JSON with keys setting (INT or EXT), location, time, characters (array of uppercase names). Scene: ${text}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`Mistral API error ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  return SceneInfo.parse(JSON.parse(content));
}

export const getServer = (): McpServer => {
  const server = new McpServer(
    { name: "scenarios-server", version: "0.1.0" },
    { capabilities: {} },
  );

  server.tool(
    "parse_scene",
    "Parse a script scene and store metadata",
    {
      id: z.string().describe("Unique scene id"),
      text: z.string().describe("Scene heading or description"),
    },
    async ({ id, text }): Promise<CallToolResult> => {
      const meta = await parseWithMistral(text);
      const scene = {
        id,
        raw: text,
        ...meta,
        characters: meta.characters.map((c) => c.toUpperCase()),
      };
      sceneStore.push(scene);
      return {
        content: [{ type: "text", text: JSON.stringify(scene) }],
      };
    },
  );

  const findShape = {
    sceneNumber: z.string().optional(),
    characters: z.array(z.string()).optional(),
    setting: z.enum(["INT", "EXT"]).optional(),
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
        (!setting || s.setting === setting) &&
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

