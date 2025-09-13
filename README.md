# scenariOS

Prototype web app for analyzing film scripts using the Model Context Protocol.

## Features

- Upload a PDF script and extract text via a minimal OCR endpoint.
- MCP tools `parse_scene` and `search_scenes` for structured scene metadata.

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The app runs at <http://localhost:3000>. Try uploading a PDF to see extracted text.

## Production build

```bash
npm run build
```

## MCP inspector

Set `MISTRAL_API_KEY` and test the MCP endpoint with the inspector:

```bash
MISTRAL_API_KEY=your_key npm run inspector
```

Use `parse_scene` to add scenes, then `search_scenes` to query them.

