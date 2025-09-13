import { useState } from 'react';
import FileUploader from '../components/FileUploader';
import ScriptDisplay from '../components/ScriptDisplay';
import { Scene, parseScript } from '../utils/parseScript';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);

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
      const parsed = parseScript(data.text ?? '');
      setScenes(parsed);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-6">
      <div className="w-full max-w-3xl space-y-8">
        <h1 className="text-center text-3xl font-light tracking-tight text-gray-900">
          Upload Film Script
        </h1>
        <FileUploader onFile={processFile} loading={loading} />
        <ScriptDisplay scenes={scenes} />
      </div>
    </main>
  );
}
