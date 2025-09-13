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

  return (
    <main
      className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-200"
      style={{ height: '100dvh' }}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden p-6">
        <h1 className="mb-4 text-left text-2xl font-light tracking-tight text-gray-800">scenariOS</h1>
        {!scenes.length ? (
          <>
            <h2 className="mt-8 text-2xl font-light tracking-tight text-gray-900">Upload Film Script</h2>
            <FileUploader onFile={processFile} loading={loading} />
          </>
        ) : (
          <div className="mb-4 text-left">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">by {author}</p>
          </div>
        )}
        {scenes.length > 0 && (
          <div className="flex-1 overflow-hidden">
            <ScriptDisplay scenes={scenes} characters={characters} />
          </div>
        )}
      </div>
    </main>
  );
}
