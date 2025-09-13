import { useState } from 'react';
import FileUploader from '../components/FileUploader';
import ScriptDisplay from '../components/ScriptDisplay';
import { Scene, CharacterStats, parseScript } from '../utils/parseScript';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<CharacterStats[]>([]);
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [sceneText, setSceneText] = useState('INT. OFFICE - DAY Paul enters.');
  const [parseResult, setParseResult] = useState('');
  const [searchCharacter, setSearchCharacter] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState('');

  async function processFile(file: File) {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64 }),
      });
      const data = await res.json();
      const text = data.text ?? '';
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
    const pages = text.split('\f');
    const firstPage = pages[0] || '';
    const lines = firstPage
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const scriptTitle = lines[0] || 'Untitled';
    const authorLine = lines.find((l) => /^by\s+/i.test(l));
    const scriptAuthor = authorLine ? authorLine.replace(/^by\s+/i, '') : 'Unknown';
    return [scriptTitle, scriptAuthor];
  }

  async function callMcp(body: any) {
    const res = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function parseScene() {
    const data = await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'call_tool',
      params: {
        name: 'parse_scene',
        arguments: { id: Date.now().toString(), text: sceneText },
      },
    });
    const text = data.result?.content?.[0]?.text ?? '';
    try {
      setParseResult(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      setParseResult(text);
    }
  }

  async function searchScenes() {
    const data = await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'call_tool',
      params: {
        name: 'search_scenes',
        arguments: {
          characters: searchCharacter
            ? searchCharacter.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
        },
      },
    });
    const text = data.result?.content?.[0]?.text ?? '';
    try {
      setSearchResult(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      setSearchResult(text);
    }
  }

  async function queryScenes() {
    const data = await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'call_tool',
      params: {
        name: 'query_scenes',
        arguments: { query },
      },
    });
    const text = data.result?.content?.[0]?.text ?? '';
    try {
      setQueryResult(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      setQueryResult(text);
    }
  }

  return (
    <main
      className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-200"
      style={{ height: '100dvh' }}
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
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-medium">MCP Test</h2>
          <div className="space-y-2">
            <textarea
              className="w-full rounded border p-2"
              value={sceneText}
              onChange={(e) => setSceneText(e.target.value)}
            />
            <button
              className="rounded bg-blue-500 px-3 py-1 text-white"
              onClick={parseScene}
            >
              Parse Scene
            </button>
            <pre className="whitespace-pre-wrap break-words text-sm">
              {parseResult}
            </pre>
          </div>
          <div className="space-y-2">
            <input
              className="w-full rounded border p-2"
              placeholder="Search by character"
              value={searchCharacter}
              onChange={(e) => setSearchCharacter(e.target.value)}
            />
            <button
              className="rounded bg-green-600 px-3 py-1 text-white"
              onClick={searchScenes}
            >
              Search Scenes
            </button>
            <pre className="whitespace-pre-wrap break-words text-sm">
              {searchResult}
            </pre>
          </div>
          <div className="space-y-2">
            <input
              className="w-full rounded border p-2"
              placeholder="Natural language query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="rounded bg-purple-600 px-3 py-1 text-white"
              onClick={queryScenes}
            >
              Query Scenes
            </button>
            <pre className="whitespace-pre-wrap break-words text-sm">
              {queryResult}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
