import { useState } from "react";
import Link from "next/link";
import FileUploader from "../components/FileUploader";
import ScriptDisplay from "../components/ScriptDisplay";
import { Scene, CharacterStats, parseScript } from "../utils/parseScript";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<CharacterStats[]>([]);
  const [title, setTitle] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [findArgs, setFindArgs] = useState<string>("");
  const [findResult, setFindResult] = useState<string>("");
  const [printArgs, setPrintArgs] = useState<string>("");
  const [printResult, setPrintResult] = useState<string>("");

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

  async function callMcp(body: any, setter: (s: string) => void) {
    setter("");
    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify(body),
      });
      if (!res.body) {
        const text = await res.text();
        throw new Error(text || "No response");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        setter(raw);
      }
      try {
        const data = JSON.parse(raw);
        const text = data.result?.content?.[0]?.text ?? "";
        try {
          setter(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setter(text);
        }
      } catch {
        setter(raw);
      }
    } catch (err: any) {
      setter(err.message || String(err));
    }
  }

  async function runFind() {
    let args = {};
    try {
      args = findArgs ? JSON.parse(findArgs) : {};
    } catch (e) {
      setFindResult("Invalid JSON");
      return;
    }
    await callMcp(
      {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: "find", arguments: args },
      },
      setFindResult,
    );
  }

  async function runPrint() {
    let args = {};
    try {
      args = printArgs ? JSON.parse(printArgs) : {};
    } catch (e) {
      setPrintResult("Invalid JSON");
      return;
    }
    await callMcp(
      {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: "print", arguments: args },
      },
      setPrintResult,
    );
  }

  return (
    <main
      className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-200"
      style={{ height: "100dvh" }}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden p-6">
        <h1 className="mb-4 text-left text-base font-light text-gray-600">scenariOS</h1>
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
        {scenes.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Debug metadata</h3>
            <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-xs shadow">
              {JSON.stringify({ scenes, characters }, null, 2)}
            </pre>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="flex flex-col rounded border bg-white p-4 shadow">
                <h4 className="mb-2 font-medium">Find Scenes</h4>
                <textarea
                  className="mb-2 flex-1 rounded border p-2 text-xs"
                  placeholder='{"characters":["MARK"],"time":"NIGHT"}'
                  value={findArgs}
                  onChange={(e) => setFindArgs(e.target.value)}
                />
                <button
                  className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                  onClick={runFind}
                >
                  Run
                </button>
                <pre className="mt-2 h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-xs">
                  {findResult}
                </pre>
              </section>

              <section className="flex flex-col rounded border bg-white p-4 shadow">
                <h4 className="mb-2 font-medium">Print Scenes</h4>
                <textarea
                  className="mb-2 flex-1 rounded border p-2 text-xs"
                  placeholder='{"sceneNumber":"1"}'
                  value={printArgs}
                  onChange={(e) => setPrintArgs(e.target.value)}
                />
                <button
                  className="rounded bg-purple-600 px-3 py-1 text-white hover:bg-purple-700"
                  onClick={runPrint}
                >
                  Run
                </button>
                <pre className="mt-2 h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-xs">
                  {printResult}
                </pre>
              </section>
            </div>
          </div>
        )}
        <div className="mt-6">
          <Link href="/mcp" className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Open MCP Tester
          </Link>
        </div>
      </div>
    </main>
  );
}
