# scenariOS

Prototype web app for analyzing film scripts using the Model Context Protocol.

## Features

- Upload a PDF script and extract text via a minimal OCR endpoint.
- MCP tools `parse_scene`, `search_scenes`, and `query_scenes` for structured and natural language scene search.
- Browser-based MCP tester at `/mcp` with streaming results.

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The app runs at <http://localhost:3000>. Try uploading a PDF to see extracted text, or open <http://localhost:3000/mcp> to exercise the MCP tools.

When deploying to container platforms such as Alpic's AWS Lambda environment, the app now binds to the port specified by the `PORT` environment variable (default `8080`) and listens on all interfaces. This prevents startup timeouts during deployment.

## Production build

```bash
npm run build
```

## MCP inspector

Set `MISTRAL_API_KEY` in your environment (server runtime) and test the MCP endpoint with the inspector:

```bash
MISTRAL_API_KEY=your_key npm run inspector
```

Use `parse_scene` to add scenes, `search_scenes` for structured filters, or `query_scenes` with natural language like "give me all scenes with Paul and Ana".

