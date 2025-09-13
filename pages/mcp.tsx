import { useState } from 'react';
import Link from 'next/link';

export default function McpTester() {
  const [sceneText, setSceneText] = useState('INT. OFFICE - DAY Paul enters.');
  const [parseResult, setParseResult] = useState('');
  const [findSceneNumber, setFindSceneNumber] = useState('');
  const [findCharacter, setFindCharacter] = useState('');
  const [findSetting, setFindSetting] = useState('');
  const [findLocation, setFindLocation] = useState('');
  const [findTime, setFindTime] = useState('');
  const [findResult, setFindResult] = useState('');
  const [printSceneNumber, setPrintSceneNumber] = useState('');
  const [printCharacter, setPrintCharacter] = useState('');
  const [printSetting, setPrintSetting] = useState('');
  const [printLocation, setPrintLocation] = useState('');
  const [printTime, setPrintTime] = useState('');
  const [printResult, setPrintResult] = useState('');

  async function callMcp(body: any, setter: (s: string) => void) {
    setter('');
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(body),
      });
      if (!res.body) {
        const text = await res.text();
        throw new Error(text || 'No response');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        setter(raw);
      }
      try {
        const data = JSON.parse(raw);
        const text = data.result?.content?.[0]?.text ?? '';
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

  async function runParse() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'parse_scene',
          arguments: { id: Date.now().toString(), text: sceneText },
        },
      },
      setParseResult
    );
  }

  async function runFind() {
    const args: Record<string, any> = {};
    if (findSceneNumber) args.sceneNumber = findSceneNumber;
    if (findCharacter)
      args.characters = findCharacter
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (findSetting) args.setting = findSetting;
    if (findLocation) args.location = findLocation;
    if (findTime) args.time = findTime;
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: 'find', arguments: args },
      },
      setFindResult
    );
  }

  async function runPrint() {
    const args: Record<string, any> = {};
    if (printSceneNumber) args.sceneNumber = printSceneNumber;
    if (printCharacter)
      args.characters = printCharacter
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (printSetting) args.setting = printSetting;
    if (printLocation) args.location = printLocation;
    if (printTime) args.time = printTime;
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: 'print', arguments: args },
      },
      setPrintResult
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">MCP Tester</h1>
          <Link
            href="/"
            className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
          >
            Back
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <section className="flex flex-col rounded border bg-white p-4 shadow">
            <h2 className="mb-2 font-medium">Parse Scene</h2>
            <textarea
              className="mb-2 flex-1 rounded border p-2"
              value={sceneText}
              onChange={(e) => setSceneText(e.target.value)}
            />
            <button
              className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
              onClick={runParse}
            >
              Run
            </button>
            <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
              {parseResult}
            </pre>
          </section>

          <section className="flex flex-col rounded border bg-white p-4 shadow">
            <h2 className="mb-2 font-medium">Find Scenes</h2>
            <input
              className="mb-2 rounded border p-2"
              placeholder="Scene number"
              value={findSceneNumber}
              onChange={(e) => setFindSceneNumber(e.target.value)}
            />
            <input
              className="mb-2 rounded border p-2"
              placeholder="Comma-separated characters"
              value={findCharacter}
              onChange={(e) => setFindCharacter(e.target.value)}
            />
            <input
              className="mb-2 rounded border p-2"
              placeholder="Setting (INT or EXT)"
              value={findSetting}
              onChange={(e) => setFindSetting(e.target.value)}
            />
            <input
              className="mb-2 rounded border p-2"
              placeholder="Location"
              value={findLocation}
              onChange={(e) => setFindLocation(e.target.value)}
            />
            <input
              className="mb-2 rounded border p-2"
              placeholder="Time"
              value={findTime}
              onChange={(e) => setFindTime(e.target.value)}
            />
            <button
              className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
              onClick={runFind}
            >
              Run
            </button>
            <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
              {findResult}
            </pre>
          </section>

          <section className="flex flex-col rounded border bg-white p-4 shadow">
            <h2 className="mb-2 font-medium">Print Scenes</h2>
            <input
              className="mb-2 rounded border p-2"
              placeholder="Scene number"
              value={printSceneNumber}
              onChange={(e) => setPrintSceneNumber(e.target.value)}
            />
            <input
              className="mb-2 rounded border p-2"
              placeholder="Comma-separated characters"
              value={printCharacter}
              onChange={(e) => setPrintCharacter(e.target.value)}
            />
            <input
              className="mb-2 rounded border p-2"
              placeholder="Setting (INT or EXT)"
              value={printSetting}
              onChange={(e) => setPrintSetting(e.target.value)}
            />
            <input
              className="mb-2 rounded border p-2"
              placeholder="Location"
              value={printLocation}
              onChange={(e) => setPrintLocation(e.target.value)}
            />
            <input
              className="mb-2 rounded border p-2"
              placeholder="Time"
              value={printTime}
              onChange={(e) => setPrintTime(e.target.value)}
            />
            <button
              className="rounded bg-purple-600 px-3 py-1 text-white hover:bg-purple-700"
              onClick={runPrint}
            >
              Run
            </button>
            <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
              {printResult}
            </pre>
          </section>
        </div>
      </div>
    </main>
  );
}
