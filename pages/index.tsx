import { useState } from 'react'

export default function Home() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [mcp, setMcp] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64 }),
      })
      const data = await res.json()
      setText(data.text ?? '')
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  async function testMcp() {
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'call_tool',
          params: { name: 'greet', arguments: { name: 'World' } },
        }),
      })
      const data = await res.json()
      setMcp(JSON.stringify(data, null, 2))
    } catch (err) {
      setMcp('Error')
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-semibold">scenariOS</h1>
        <p className="text-sm text-neutral-600">Upload a film script PDF and test MCP connectivity.</p>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          className="block w-full text-sm"
        />
        {loading && <p>Processing...</p>}
        {text && (
          <pre className="whitespace-pre-wrap rounded border p-4 bg-white shadow">
            {text.slice(0, 1000)}
          </pre>
        )}
        <div className="space-y-2 pt-4">
          <button
            type="button"
            onClick={testMcp}
            className="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700"
          >
            Test MCP
          </button>
          {mcp && (
            <pre className="whitespace-pre-wrap rounded border p-4 bg-white shadow">{mcp}</pre>
          )}
        </div>
      </div>
    </main>
  )
}
