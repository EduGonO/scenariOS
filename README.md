# scenariOS

Prototype web app for analyzing film scripts using the Model Context Protocol.

## Features

- Upload a PDF script and extract text via a minimal OCR endpoint.
- MCP tools `parse_scene`, `search_scenes`, and `query_scenes` for structured and natural language scene search.
- Browser-based MCP tester at `/debug` with streaming results.

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The app runs at <http://localhost:3000>. Try uploading a PDF to see extracted text, or open <http://localhost:3000/debug> to exercise the MCP tools.

For deployments and MCP clients like Mistral's Le Chat, a standalone Express server is built into `dist/index.js` and serves the MCP endpoint at `/mcp`. The server listens on the port defined by `PORT` (or `MCP_HTTP_PORT`), defaulting to `8080` for platforms such as Alpic's AWS Lambda containers.

## Production build

```bash
npm run build
```

## MCP inspector

Set `MISTRAL_API_KEY` in your environment (server runtime) and test the MCP endpoint with the inspector:

```bash
MISTRAL_API_KEY=your_key npm run inspector
```

Point the inspector's Streamable HTTP URL at `http://localhost:3000/mcp`
or your deployed application's `/mcp` endpoint.

Use `parse_scene` to add scenes, `search_scenes` for structured filters, or `query_scenes` with natural language like "give me all scenes with Paul and Ana".
