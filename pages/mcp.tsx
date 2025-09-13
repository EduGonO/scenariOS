import { useState } from 'react';
import Link from 'next/link';

export default function McpTester() {
  const [sceneText, setSceneText] = useState('INT. OFFICE - DAY Paul enters.');
  const [parseResult, setParseResult] = useState('');
  const [searchCharacter, setSearchCharacter] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState('');

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
        setter(JSON.stringify(JSON.parse(text), null, 2));
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

  async function runSearch() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'search_scenes',
          arguments: {
            characters: searchCharacter
              ? searchCharacter.split(',').map((s) => s.trim()).filter(Boolean)
              : undefined,
          },
        },
      },
      setSearchResult
    );
  }

  async function runQuery() {
    await callMcp(
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: 'query_scenes', arguments: { query } },
      },
      setQueryResult
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
            <h2 className="mb-2 font-medium">Search Scenes</h2>
            <input
              className="mb-2 rounded border p-2"
              placeholder="Comma-separated characters"
              value={searchCharacter}
              onChange={(e) => setSearchCharacter(e.target.value)}
            />
            <button
              className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
              onClick={runSearch}
            >
              Run
            </button>
            <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
              {searchResult}
            </pre>
          </section>

          <section className="flex flex-col rounded border bg-white p-4 shadow">
            <h2 className="mb-2 font-medium">Query Scenes</h2>
            <input
              className="mb-2 rounded border p-2"
              placeholder="Natural language query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="rounded bg-purple-600 px-3 py-1 text-white hover:bg-purple-700"
              onClick={runQuery}
            >
              Run
            </button>
            <pre className="mt-2 h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-sm">
              {queryResult}
            </pre>
          </section>
        </div>
      </div>
    </main>
  );
}
