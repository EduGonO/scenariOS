import { useState } from "react";
import Link from "next/link";
import FileUploader from "../components/FileUploader";
import ScriptDisplay from "../components/ScriptDisplay";
import McpDebug from "../components/McpDebug";
import { Scene, CharacterStats, parseScript } from "../utils/parseScript";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<CharacterStats[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [debugVisible, setDebugVisible] = useState(false);

  async function processFile(file: File) {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64 }),
      });
      const data = await res.json();
      const text = data.text ?? "";
      const { scenes: parsedScenes, characters: parsedChars } = parseScript(text);
      const [scriptTitle, scriptAuthor] = extractMetadata(text);
      setScenes(parsedScenes);
      setCharacters(parsedChars);
      setTitle(scriptTitle);
      setAuthor(scriptAuthor);
      if (typeof window !== "undefined") {
        localStorage.setItem("scenes", JSON.stringify(parsedScenes));
        localStorage.setItem("characters", JSON.stringify(parsedChars));
        localStorage.setItem("title", scriptTitle);
        localStorage.setItem("author", scriptAuthor);
      }
      await registerScenes(parsedScenes);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  function extractMetadata(text: string): [string, string] {
    const pages = text.split("\f");
    const firstPage = pages[0] || "";
    const lines = firstPage
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const scriptTitle = lines[0] || "Untitled";
    const authorLine = lines.find((l) => /^by\s+/i.test(l));
    const scriptAuthor = authorLine ? authorLine.replace(/^by\s+/i, "") : "Unknown";
    return [scriptTitle, scriptAuthor];
  }

  async function registerScenes(parsed: Scene[]) {
    for (const scene of parsed) {
      const raw = [
        scene.heading,
        ...scene.parts.map((p) =>
          p.type === "dialogue" ? `${p.character}\n${p.text}` : p.text,
        ),
      ].join("\n");
      await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "parse_scene",
            arguments: {
              id: String(scene.sceneNumber),
              text: raw,
              setting: scene.setting,
              location: scene.location,
              time: scene.time,
              characters: scene.characters,
            },
          },
        }),
      });
    }
  }

  return (
    <main
      className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-200"
      style={{ height: "100dvh" }}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-base font-light text-gray-600">scenariOS</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDebugVisible(true)}
              className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
            >
              Debug
            </button>
            <Link
              href="/mcp"
              className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
            >
              MCP
            </Link>
          </div>
        </div>
        {!scenes.length ? (
          <>
            <h2 className="mt-8 text-2xl font-light tracking-tight text-gray-900">Upload Film Script</h2>
            <FileUploader onFile={processFile} loading={loading} />
          </>
        ) : (
          <div className="mb-4 text-left">
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-base text-gray-700">by {author}</p>
          </div>
        )}
        {scenes.length > 0 && (
          <div className="flex-1 overflow-hidden">
            <ScriptDisplay scenes={scenes} characters={characters} />
          </div>
        )}
      </div>
      {debugVisible && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 text-right">
              <button
                type="button"
                onClick={() => setDebugVisible(false)}
                className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
              >
                Close
              </button>
            </div>
            <McpDebug />
          </div>
        </div>
      )}
    </main>
  );
}

