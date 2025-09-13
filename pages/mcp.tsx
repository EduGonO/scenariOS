import Link from 'next/link';
import McpDebug from '../components/McpDebug';

export default function McpTester() {
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
        <McpDebug />
      </div>
    </main>
  );
}
