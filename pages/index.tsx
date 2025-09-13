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
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const scriptTitle = lines[0] || 'Untitled';
    const authorLine = lines.find((l) => /^by\s+/i.test(l));
    const scriptAuthor = authorLine ? authorLine.replace(/^by\s+/i, '') : 'Unknown';
    return [scriptTitle, scriptAuthor];
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-6">
      <div className="w-full max-w-5xl space-y-8">
        <h1 className="text-center text-4xl font-light tracking-tight text-gray-900">
          scenariOS
        </h1>
        {!scenes.length ? (
          <>
            <h2 className="text-center text-3xl font-light tracking-tight text-gray-900">
              Upload Film Script
            </h2>
            <FileUploader onFile={processFile} loading={loading} />
          </>
        ) : (
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            <p className="text-gray-600">by {author}</p>
          </div>
        )}
        {scenes.length > 0 && (
          <ScriptDisplay scenes={scenes} characters={characters} />
        )}
      </div>
    </main>
  );
}
