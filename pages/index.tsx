import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }

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
      setText(data.text ?? '');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-6">
      <div className="w-full max-w-xl space-y-8">
        <h1 className="text-center text-3xl font-light tracking-tight text-gray-900">
          Upload Film Script
        </h1>

        <label
          htmlFor="file"
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center transition hover:border-gray-400 hover:shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-12 w-12 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5V19a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 19v-2.5M16.5 12L12 7.5 7.5 12M12 7.5v9"
            />
          </svg>
          <span className="mt-4 text-sm text-gray-600">Select PDF script</span>
          <input
            id="file"
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>

        {loading && (
          <div className="flex justify-center">
            <svg
              className="h-6 w-6 animate-spin text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          </div>
        )}

        {text && (
          <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {text.slice(0, 1000)}
          </pre>
        )}
      </div>
    </main>
  );
}
