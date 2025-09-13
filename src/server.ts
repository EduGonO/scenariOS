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
  const apiKey = process.env.MISTRAL_API_KEY;
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
            `Extract scene metadata as JSON with keys setting (INT or EXT), location, time, characters (array). Scene: ${text}`,
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
      const scene = { id, raw: text, ...meta };
      sceneStore.push(scene);
      return {
        content: [{ type: "text", text: JSON.stringify(scene) }],
      };
    },
  );

  server.tool(
    "search_scenes",
    "Search previously parsed scenes",
    {
      setting: z.enum(["INT", "EXT"]).optional(),
      location: z.string().optional(),
      time: z.string().optional(),
      character: z.string().optional(),
    },
    async ({ setting, location, time, character }): Promise<CallToolResult> => {
      const results = sceneStore.filter((s) =>
        (!setting || s.setting === setting) &&
        (!location || s.location.toLowerCase().includes(location.toLowerCase())) &&
        (!time || s.time.toLowerCase().includes(time.toLowerCase())) &&
        (!character || s.characters.includes(character)),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(results) }],
      };
    },
  );

  return server;
};

