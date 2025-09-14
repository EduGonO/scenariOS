# scenariOS

scenariOS transforms raw film scripts into a schedule-aware production assistant. It combines a responsive web interface with a Model Context Protocol (MCP) server so Le Chat can reason about scenes, logistics, and scheduling in real time.

## Highlights

- Parse scripts into structured scenes with duration estimates and candidate shooting locations.
- Persist scenes and characters to track actor assignments and scene metadata across sessions.
- Interactive calendar constrained by global filming dates; tap days to add or remove potential shooting dates with auto-calculated end times.
- Compact map showing the primary location and nearby backups with distances in kilometers plus a "show similar" option.
- Weather panel forecasting temperature, rain, clouds, visibility, and golden-hour range for the chosen date and place.
- Rich scene queries such as "print all scheduled scenes" or "how many scenes have more than 3 dates".
- Natural-language helpers like "how many scenes do Mark and Eduardo share?" or "print scene 24".
- PDF exports use a clean Courier layout without stray HTML entities.
- Built-in MCP inspector at `/debug` for exercising tools directly in the browser.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `parse_pdf` | Parse an entire script and seed scene/character stores. |
| `parse_scene` | Register or update a single scene with metadata. |
| `find` | Return scenes matching attributes such as characters, time or scheduled dates. |
| `print` | Render matching scenes as formatted markdown. |
| `print_pdf` | Render matching scenes as a downloadable PDF. |
| `print_query` | Natural language scene search. |
| `count` | Count scenes matching filters. |
| `count_query` | Count scenes using a natural language prompt. |
| `characters` | List characters and assigned actors. |
| `assign_actor` | Attach actor name/email to a character. |
| `create_call_sheet_pdf` | Generate and share a PDF call sheet for scenes. |
| `update_scene` | Add or remove shooting dates or locations. |
| `calendar_suggest` | Suggest viable shooting dates for a scene. |
| `map_search` | Find a location and 3–4 nearby backups. |
| `map_similar` | Discover similar locations near the current choice. |
| `weather_forecast` | Fetch weather and light info for a date/location. |

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Visit <http://localhost:3000> to upload a PDF or interact with the calendar and map panels. The MCP inspector lives at <http://localhost:3000/debug>.

For production or Le Chat, build the standalone server which exposes `/mcp`:

```bash
npm run build
```

The server listens on `PORT` (or `MCP_HTTP_PORT`), defaulting to `8080`.

To generate call sheet PDFs, provide Google service account credentials:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## MCP Inspector

Set `MISTRAL_API_KEY` and start the inspector:

```bash
MISTRAL_API_KEY=your_key npm run inspector
```

Point the inspector's streamable URL at `http://localhost:3000/mcp` (or your deployed endpoint) and call tools such as `calendar_suggest`, `map_search`, `weather_forecast` or any of the scene query helpers to drive scheduling decisions from Le Chat.
