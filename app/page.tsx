"use client";

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
      setText(data.text ?? "");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="p-6 space-y-4">
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFile}
        className="block"
      />
      {loading && <p>Processing...</p>}
      {text && (
        <pre className="whitespace-pre-wrap rounded border p-4">
          {text.slice(0, 1000)}
        </pre>
      )}
    </main>
  );
}

