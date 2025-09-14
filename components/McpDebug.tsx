import { useState, useEffect } from 'react';
import type { Scene } from '../utils/parseScript';

export default function McpDebug() {
  const [findSceneNumber, setFindSceneNumber] = useState('');
  const [findCharacter, setFindCharacter] = useState('');
  const [findSetting, setFindSetting] = useState('');
  const [findLocation, setFindLocation] = useState('');
  const [findTime, setFindTime] = useState('');
   const [findDuration, setFindDuration] = useState('');
   const [findShootingDate, setFindShootingDate] = useState('');
   const [findShootingLocation, setFindShootingLocation] = useState('');
  const [findResult, setFindResult] = useState('');
  const [printSceneNumber, setPrintSceneNumber] = useState('');
  const [printCharacter, setPrintCharacter] = useState('');
  const [printSetting, setPrintSetting] = useState('');
  const [printLocation, setPrintLocation] = useState('');
  const [printTime, setPrintTime] = useState('');
   const [printDuration, setPrintDuration] = useState('');
   const [printShootingDate, setPrintShootingDate] = useState('');
   const [printShootingLocation, setPrintShootingLocation] = useState('');
  const [printResult, setPrintResult] = useState('');
  const [printPdfUrl, setPrintPdfUrl] = useState('');
  const [assignCharacter, setAssignCharacter] = useState('');
  const [assignActorName, setAssignActorName] = useState('');
  const [assignActorEmail, setAssignActorEmail] = useState('');
  const [assignResult, setAssignResult] = useState('');
  const [sendCharacter, setSendCharacter] = useState('');
  const [sendResult, setSendResult] = useState('');
  const [callSceneIds, setCallSceneIds] = useState('');
  const [callSheetResult, setCallSheetResult] = useState('');
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
    if (findDuration) args.sceneDuration = Number(findDuration);
    if (findShootingDate) args.shootingDate = findShootingDate;
    if (findShootingLocation) args.shootingLocation = findShootingLocation;
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
    if (printDuration) args.sceneDuration = Number(printDuration);
    if (printShootingDate) args.shootingDate = printShootingDate;
    if (printShootingLocation) args.shootingLocation = printShootingLocation;
    setPrintPdfUrl('');
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

  async function runPrintPdf() {
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
    if (printDuration) args.sceneDuration = Number(printDuration);
    if (printShootingDate) args.shootingDate = printShootingDate;
    if (printShootingLocation) args.shootingLocation = printShootingLocation;
    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name: 'print_pdf', arguments: args },
        }),
      });
      const data = await res.json();
      const base64 = data.result?.content?.[0]?.text || '';
      if (base64) {
        try {
          const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const blob = new Blob([bin], { type: 'application/pdf' });
          setPrintPdfUrl(URL.createObjectURL(blob));
        } catch (e: any) {
          setPrintPdfUrl('');
          setPrintResult(e.message || String(e));
        }
      } else {
        setPrintPdfUrl('');
      }
    } catch (err: any) {
      setPrintPdfUrl('');
      setPrintResult(err.message || String(err));
    }
  }

  function downloadMarkdown() {
    if (!printResult) return;
    const blob = new Blob([printResult], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenes.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runAssignActor() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'assign_actor',
          arguments: { name: assignCharacter, actorName: assignActorName, actorEmail: assignActorEmail },
        },
      },
      setAssignResult,
    );
  }

  async function runSendScenes() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: 'send_actor_scenes_doc', arguments: { character: sendCharacter } },
      },
      setSendResult,
    );
  }

  function parseSceneIds(): string[] {
    return callSceneIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function runCallSheetDoc() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: 'create_call_sheet_doc', arguments: { sceneIds: parseSceneIds() } },
      },
      setCallSheetResult,
    );
  }

  async function runCallSheetSheet() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: 'create_call_sheet_sheet', arguments: { sceneIds: parseSceneIds() } },
      },
      setCallSheetResult,
    );
  }

  async function runCallSheetPdf() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: 'create_call_sheet_pdf', arguments: { sceneIds: parseSceneIds() } },
      },
      setCallSheetResult,
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
          <input
            className="mb-2 rounded border p-2"
            placeholder="Duration (sec)"
            value={findDuration}
            onChange={(e) => setFindDuration(e.target.value)}
          />
          <input
            className="mb-2 rounded border p-2"
            placeholder="Shooting date"
            value={findShootingDate}
            onChange={(e) => setFindShootingDate(e.target.value)}
          />
          <input
            className="mb-2 rounded border p-2"
            placeholder="Shooting location"
            value={findShootingLocation}
            onChange={(e) => setFindShootingLocation(e.target.value)}
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
          <input
            className="mb-2 rounded border p-2"
            placeholder="Duration (sec)"
            value={printDuration}
            onChange={(e) => setPrintDuration(e.target.value)}
          />
          <input
            className="mb-2 rounded border p-2"
            placeholder="Shooting date"
            value={printShootingDate}
            onChange={(e) => setPrintShootingDate(e.target.value)}
          />
          <input
            className="mb-2 rounded border p-2"
            placeholder="Shooting location"
            value={printShootingLocation}
            onChange={(e) => setPrintShootingLocation(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-purple-600 px-3 py-1 text-white hover:bg-purple-700"
              onClick={runPrint}
            >
              Markdown
            </button>
            <button
              type="button"
              className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
              onClick={runPrintPdf}
            >
              PDF
            </button>
          </div>
          <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
            {printResult}
          </pre>
          {printResult && (
            <button
              type="button"
              className="mt-2 rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300"
              onClick={downloadMarkdown}
            >
              Download Markdown
            </button>
          )}
          {printPdfUrl && (
            <a
              href={printPdfUrl}
              download="scenes.pdf"
              className="mt-2 inline-block rounded bg-gray-200 px-2 py-1 text-center text-sm hover:bg-gray-300"
            >
              Download PDF
            </a>
          )}
        </section>

        <section className="flex flex-col rounded border bg-white p-4 shadow">
          <h2 className="mb-2 font-medium">Assign Actor</h2>
          <input
            className="mb-2 rounded border p-2"
            placeholder="Character"
            value={assignCharacter}
            onChange={(e) => setAssignCharacter(e.target.value)}
          />
          <input
            className="mb-2 rounded border p-2"
            placeholder="Actor name"
            value={assignActorName}
            onChange={(e) => setAssignActorName(e.target.value)}
          />
          <input
            className="mb-2 rounded border p-2"
            placeholder="Actor email"
            value={assignActorEmail}
            onChange={(e) => setAssignActorEmail(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
            onClick={runAssignActor}
          >
            Save
          </button>
          <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
            {assignResult}
          </pre>
        </section>

        <section className="flex flex-col rounded border bg-white p-4 shadow">
          <h2 className="mb-2 font-medium">Send Actor Scenes</h2>
          <input
            className="mb-2 rounded border p-2"
            placeholder="Character"
            value={sendCharacter}
            onChange={(e) => setSendCharacter(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
            onClick={runSendScenes}
          >
            Send
          </button>
          <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
            {sendResult}
          </pre>
        </section>

        <section className="flex flex-col rounded border bg-white p-4 shadow">
          <h2 className="mb-2 font-medium">Create Call Sheet</h2>
          <input
            className="mb-2 rounded border p-2"
            placeholder="Comma-separated scene IDs"
            value={callSceneIds}
            onChange={(e) => setCallSceneIds(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
              onClick={runCallSheetDoc}
            >
              Google Doc
            </button>
            <button
              type="button"
              className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
              onClick={runCallSheetSheet}
            >
              Google Sheet
            </button>
            <button
              type="button"
              className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
              onClick={runCallSheetPdf}
            >
              PDF
            </button>
          </div>
          <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
            {callSheetResult}
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
