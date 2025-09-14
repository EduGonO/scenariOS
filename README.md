# scenariOS

scenariOS is a Mistral MCP hackathon entry that turns raw film scripts into a schedule-aware production assistant. It exposes a web UI and an MCP server so Le Chat can read scripts, reason about logistics, and update metadata in real time.

## Highlights

- Parse scripts into structured scenes with duration estimates and candidate locations.
- Persist scenes and characters globally to track actor assignments and metadata.
- Interactive calendar constrained by global filming dates; tap days to add or remove potential shooting dates and set start times with auto‑calculated end times.
- Compact map showing the primary location and nearby backups with distance in km plus a "show similar" option.
- Weather panel forecasting temperature, rain, clouds, visibility, and golden‑hour range for the chosen date and place.
- Rich scene queries like "print all scheduled scenes" or "how many scenes have more than 3 dates".
- Browser MCP inspector at `/debug` for trying tools directly in the browser.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `parse_pdf` | Parse an entire script and seed scene/character stores. |
| `parse_scene` | Register or update a single scene with metadata. |
| `find` | Return scenes matching attributes such as characters, time, or scheduled dates. |
| `print` | Render matching scenes as formatted markdown. |
| `count` | Count scenes matching filters. |
| `query_scenes` | Natural language scene search. |
| `characters` | List characters and assigned actors. |
| `assign_actor` | Attach actor name/email to a character. |
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

## MCP Inspector

Set `MISTRAL_API_KEY` and start the inspector:

```bash
MISTRAL_API_KEY=your_key npm run inspector
```

Point the inspector's streamable URL at `http://localhost:3000/mcp` (or your deployed endpoint) and call tools such as `calendar_suggest`, `map_search`, `weather_forecast`, or any of the scene query helpers to drive scheduling decisions from Le Chat.
