import { useState, useEffect } from 'react';
import type { Scene } from '../utils/parseScript';

export default function McpDebug() {
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
  const [metaResult, setMetaResult] = useState('');

  async function registerScenes(parsed: Scene[]) {
    for (const scene of parsed) {
      const raw = [
        scene.heading,
        ...scene.parts.map((p) =>
          p.type === 'dialogue' ? `${p.character}\n${p.text}` : p.text,
        ),
      ].join('\n');
      await fetch('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'parse_scene',
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

  async function callMcp(body: any, setter: (s: string) => void) {
    setter('');
    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const text = data.result?.content?.[0]?.text ?? '';
      try {
        setter(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setter(text);
      }
    } catch (err: any) {
      setter(err.message || String(err));
    }
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
      setFindResult,
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
      setPrintResult,
    );
  }

  async function refreshMeta() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: 'find', arguments: {} },
      },
      setMetaResult,
    );
  }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('scenes') : null;
    if (stored) {
      setMetaResult(JSON.stringify(JSON.parse(stored), null, 2));
      const scenes: Scene[] = JSON.parse(stored);
      registerScenes(scenes).then(refreshMeta);
    } else {
      refreshMeta();
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
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
            type="button"
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
            type="button"
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
      <section className="flex flex-col rounded border bg-white p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">Registered Scenes</h2>
          <button
            type="button"
            onClick={refreshMeta}
            className="rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>
        <pre className="h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
          {metaResult}
        </pre>
      </section>
    </div>
  );
}
