import { useState, useEffect } from "react";
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("filmingStart", startDate);
      localStorage.setItem("filmingEnd", endDate);
    }
  }, [startDate, endDate]);

  async function fetchAllScenes(): Promise<any[]> {
    const res = await fetch("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: "find", arguments: {} },
      }),
    });
    const data = await res.json();
    const text = data?.result?.content?.[0]?.text;
    try {
      return text ? JSON.parse(text) : [];
    } catch {
      return [];
    }
  }

  async function estimateSceneDuration(text: string): Promise<number> {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const fallback = Math.round(words / 3);
    const key = process.env.NEXT_PUBLIC_MISTRAL_API_KEY;
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
                "Estimate the approximate screen time in seconds for the following film scene. Reply with ONLY a number.",
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
      const storedScenes = await fetchAllScenes();
      const merged: Scene[] = [];
      for (const sc of parsedScenes) {
        const meta = storedScenes.find((s) => s.id === String(sc.sceneNumber));
        const prompt = [
          sc.heading,
          ...sc.parts.map((p) =>
            p.type === "dialogue" ? `${p.character}: ${p.text}` : p.text,
          ),
        ].join("\n");
        let duration = Number(meta?.sceneDuration);
        if (!Number.isFinite(duration)) {
          duration = await estimateSceneDuration(prompt);
        }
        merged.push({
          ...sc,
          sceneDuration: duration,
          shootingDates: meta?.shootingDates ?? [],
          shootingLocations: meta?.shootingLocations ?? [],
        });
      }
      setScenes(merged);
      if (typeof window !== "undefined") {
        localStorage.setItem("scenes", JSON.stringify(merged));
      }
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
      await fetch("/mcp", {
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

  function assignActor(character: string, actorName: string, actorEmail: string) {
    setCharacters((prev) =>
      prev.map((c) =>
        c.name === character ? { ...c, actorName, actorEmail } : c,
      ),
    );
  }

  function updateScene(index: number, partial: Partial<Scene>) {
    setScenes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial };
      if (typeof window !== "undefined") {
        localStorage.setItem("scenes", JSON.stringify(next));
      }
      return next;
    });
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="flex w-full flex-1 min-h-0 flex-col overflow-hidden px-4 py-6">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-sm font-light text-gray-600">scenariOS</h1>
          <div>
            <button
              type="button"
              onClick={() => setDebugVisible(true)}
              className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
            >
              Debug
            </button>
          </div>
        </div>
        {!scenes.length ? (
          <>
            <h2 className="mt-8 text-xl font-light tracking-tight text-gray-900">Upload Film Script</h2>
            <FileUploader onFile={processFile} loading={loading} />
          </>
        ) : (
          <div className="mb-4 text-left">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-700">by {author}</p>
            <div className="mt-2 flex gap-3 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <span>Start:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>End:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </label>
            </div>
          </div>
        )}
        {scenes.length > 0 && (
          <div className="flex-1 min-h-0">
            <ScriptDisplay
              scenes={scenes}
              characters={characters}
              onAssignActor={assignActor}
              onUpdateScene={updateScene}
              filmingStart={startDate}
              filmingEnd={endDate}
            />
          </div>
        )}
      </div>
      {debugVisible && (
        <div className="fixed inset-x-0 top-0 z-50 h-dvh overflow-auto bg-black/50 p-4 sm:p-6">
          <div className="mx-auto">
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

