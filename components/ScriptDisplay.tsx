import React, { useMemo, useRef, useState, useEffect } from "react";
import { Scene, ScenePart, CharacterStats, cleanName } from "../utils/parseScript";
import Calendar from "./Calendar";
import LocationMap from "./LocationMap";
import WeatherPanel from "./WeatherPanel";

interface Props {
  scenes: Scene[];
  characters: CharacterStats[];
  onAssignActor?: (character: string, actorName: string, actorEmail: string) => void;
  onUpdateScene?: (index: number, partial: Partial<Scene>) => void;
  filmingStart?: string;
  filmingEnd?: string;
}

const COLORS = [
  "bg-red-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-purple-200",
  "bg-yellow-200",
  "bg-pink-200",
  "bg-indigo-200",
  "bg-teal-200",
  "bg-orange-200",
];

  export default function ScriptDisplay({
    scenes,
    characters,
  onAssignActor,
  onUpdateScene,
  filmingStart,
  filmingEnd,
}: Props) {
  const [activeScene, setActiveScene] = useState(0);
  const [filterChar, setFilterChar] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<HTMLDivElement[]>([]);
  const charBarRef = useRef<HTMLDivElement>(null);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    characters.forEach((c, i) => {
      map[c.name] = COLORS[i % COLORS.length];
    });
    return map;
  }, [characters]);

  const filteredScenes = filterChar ? scenes.filter((s) => s.characters.includes(filterChar)) : scenes;

  useEffect(() => {
    if (!filterChar) setShowReset(false);
  }, [filterChar]);

  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const top = container.scrollTop;
      const view = container.clientHeight;
      let idx = 0;
      for (let i = 0; i < sceneRefs.current.length; i++) {
        const node = sceneRefs.current[i];
        if (node && node.offsetTop <= top + view / 2) {
          idx = i;
        } else {
          break;
        }
      }
      setActiveScene(idx);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [filteredScenes]);

  useEffect(() => {
    const el = listRef.current?.children[activeScene] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeScene, filteredScenes.length]);

  useEffect(() => {
    infoRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeScene]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [filterChar]);

  useEffect(() => {
    const el = charBarRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    requestAnimationFrame(() => {
      if (charBarRef.current) charBarRef.current.scrollLeft = left;
    });
  }, [presentChars.length, otherChars.length, filterChar]);

  async function exportScenes(format: "md" | "pdf") {
    const args: Record<string, any> = {};
    if (filterChar) args.characters = [filterChar];
    const tool = format === "pdf" ? "print_pdf" : "print";
    try {
      const res = await fetch("/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: tool, arguments: args },
        }),
      });
      const data = await res.json();
      const text = data.result?.content?.[0]?.text || "";
      if (!text) return;
      if (format === "md") {
        const blob = new Blob([text], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "scenes.md";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        try {
          const binary = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
          const blob = new Blob([binary], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "scenes.pdf";
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error("Failed to decode PDF", e);
        }
      }
    } catch (err) {
      console.error("Failed to export scenes", err);
    }
  }

  function normalize(tok: string) {
    return cleanName(tok.toUpperCase()).replace(/'S?$/, "");
  }

  function highlight(text: string) {
    const tokens = text.split(/(\s+)/);
    return tokens.map((tok, idx) => {
      const base = normalize(tok);
      if (colorMap[base]) {
        return (
          <span key={idx} className={`rounded px-1 font-bold ${colorMap[base]} text-gray-800`}>
            {tok}
          </span>
        );
      }
      return tok;
    });
  }

  const { presentChars, otherChars } = useMemo(() => {
    let present: CharacterStats[] = [];
    if (filterChar) {
      const set = new Set<string>();
      filteredScenes.forEach((s) => s.characters.forEach((c) => set.add(c)));
      present = characters.filter((c) => set.has(c.name));
    } else {
      const sceneChars = filteredScenes[activeScene]?.characters || [];
      present = characters.filter((c) => sceneChars.includes(c.name));
    }
    const names = new Set(present.map((c) => c.name));
    const others = characters.filter((c) => !names.has(c.name));
    return { presentChars: present, otherChars: others };
  }, [characters, filteredScenes, activeScene, filterChar]);

  if (!scenes.length) return null;

  sceneRefs.current = [];

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-hidden"
      style={{ fontFamily: "Courier, monospace" }}
    >
      <div className="mb-2 flex items-center justify-center gap-2">
        <div className="relative">
          <button
            onClick={() => filterChar && setShowReset((v) => !v)}
            className="rounded-full bg-white/70 px-5 py-1.5 text-sm font-medium text-gray-800 shadow-sm backdrop-blur transition hover:bg-white/90"
          >
            {filterChar ? (
              <>
                Scenes with <span className="font-bold">{filterChar}</span> ({filteredScenes.length})
              </>
            ) : (
              <>All {scenes.length} scenes</>
            )}
          </button>
          {showReset && filterChar && (
            <button
              aria-label="reset"
              onClick={() => {
                setFilterChar(null);
                setActiveScene(0);
                setShowReset(false);
              }}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white shadow"
            >
              ×
            </button>
          )}
        </div>
        <button
          onClick={() => exportScenes("md")}
          className="rounded bg-white/70 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm backdrop-blur transition hover:bg-white/90"
        >
          Export MD
        </button>
        <button
          onClick={() => exportScenes("pdf")}
          className="rounded bg-white/70 px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm backdrop-blur transition hover:bg-white/90"
        >
          Export PDF
        </button>
      </div>
      <div className="flex flex-1 min-h-0 gap-6 overflow-hidden">
        <div className="h-full min-h-0 w-56 flex-shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg" ref={listRef}>
          {filteredScenes.map((scene, idx) => {
            const originalIdx = scenes.indexOf(scene);
            const displayNumber = scene.sceneNumber || originalIdx + 1;
            const type = scene.setting;
            const rest = scene.location;
            const weight = scene.sceneDuration ? ` (${scene.sceneDuration}s)` : "";
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveScene(idx);
                  requestAnimationFrame(() => {
                    const el = sceneRefs.current[idx];
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }}
                className={`block w-full border-b px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  activeScene === idx ? "bg-gray-100 font-medium" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {type && (
                      <span className="rounded bg-gray-200 px-1 text-[10px] font-semibold text-gray-700">{type}</span>
                    )}
                    {scene.time && (
                      <span className="rounded bg-gray-200 px-1 text-[10px] font-semibold text-gray-700">
                        {scene.time}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {displayNumber}
                    {weight}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-700">{rest}</div>
              </button>
            );
          })}
        </div>
        <div ref={viewerRef} className="flex-1 h-full min-h-0 overflow-y-auto px-4 pb-6 pt-0 space-y-8">
          {filteredScenes.map((scene, idx) => {
            const originalIdx = scenes.indexOf(scene);
            const displayNumber = scene.sceneNumber || originalIdx + 1;
            return (
              <div
                key={idx}
                ref={(el) => {
                  if (el) sceneRefs.current[idx] = el;
                }}
                data-index={idx}
              >
                <div className="sticky top-0 z-0 bg-white px-2 py-2 rounded-sm border border-gray-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">{displayNumber}</span>
                    {scene.setting && (
                      <span className="rounded bg-gray-200 px-1 text-xs font-semibold text-gray-700">
                        {scene.setting}
                      </span>
                    )}
                    {scene.time && (
                      <span className="rounded bg-gray-200 px-1 text-xs font-semibold text-gray-700">{scene.time}</span>
                    )}
                    <span className="text-gray-700">{scene.location}</span>
                    <div className="ml-auto flex flex-wrap gap-1 min-h-[1.25rem]">
                      {scene.characters.map((c) => (
                        <span key={c} className={`rounded px-1 text-xs font-bold ${colorMap[c]} text-gray-800`}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="space-y-4 text-gray-700">
                    {scene.parts.map((part, pIdx) => (
                      <Part key={pIdx} part={part} colorMap={colorMap} highlight={highlight} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div
          ref={infoRef}
          className="hidden h-full min-h-0 w-80 flex-shrink-0 overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-white/70 to-white/40 p-6 shadow-2xl backdrop-blur-xl lg:block"
        >
          {filteredScenes[activeScene] ? (
            <SceneInfoPanel
              scene={filteredScenes[activeScene]}
              index={scenes.indexOf(filteredScenes[activeScene])}
              characters={characters}
              onAssignActor={onAssignActor}
              onUpdateScene={onUpdateScene}
              filmingStart={filmingStart}
              filmingEnd={filmingEnd}
            />
          ) : (
            <div className="text-sm text-gray-500">No scene</div>
          )}
        </div>
      </div>
      <div
        ref={charBarRef}
        className="mt-1 flex flex-none items-start gap-6 overflow-x-auto pb-1 min-h-[4rem] [&>*:first-child]:pl-4 [&>*:last-child]:pr-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {filterChar && (
          <button
            onClick={() => {
              setFilterChar(null);
              setActiveScene(0);
              requestAnimationFrame(() => viewerRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
            }}
            className="flex-shrink-0 self-start rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Reset
          </button>
        )}
        {presentChars.length ? (
          <div className="flex flex-col gap-1 flex-none">
            <span className="sticky left-0 z-10 text-[10px] text-gray-500">Characters present</span>
            <div className="flex gap-4">
              {presentChars.map((char) => {
                const preview = char.scenes.slice(0, 8).join(", ");
                const sceneText = char.scenes.length > 8 ? `${preview}…` : preview;
                return (
                  <button
                    key={char.name}
                    onClick={() => {
                      const next = filterChar === char.name ? null : char.name;
                      setFilterChar(next);
                      if (next) {
                        setActiveScene(0);
                        requestAnimationFrame(() => {
                          const el = sceneRefs.current[0];
                          el?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                      } else {
                        setActiveScene(0);
                        requestAnimationFrame(() => viewerRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
                      }
                    }}
                    className={`flex-shrink-0 w-32 h-20 rounded-lg border bg-white px-3 py-2 text-left shadow-sm hover:bg-gray-50 ${
                      filterChar === char.name ? "bg-gray-100 font-bold" : ""
                    }`}
                  >
                    <span className={`block rounded px-1 font-bold ${colorMap[char.name]} text-gray-800`}>
                      {char.name}
                    </span>
                    {char.actorName && (
                      <div className="mt-0.5 text-[10px] text-gray-500">{char.actorName}</div>
                    )}
                    <div className="mt-1 text-[10px] leading-tight text-gray-600">
                      <div>{char.sceneCount} scenes</div>
                      <div>{char.dialogueCount} dialogues</div>
                      <div
                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                        title={`Scenes: ${char.scenes.join(", ")}`}
                      >
                        Scenes: {sceneText}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {otherChars.length ? (
          <div className="flex flex-col gap-1 flex-none">
            <span className="sticky left-0 z-10 text-[10px] text-gray-400">Other characters</span>
            <div className="flex gap-4 opacity-40 grayscale">
              {otherChars.map((char) => {
                const preview = char.scenes.slice(0, 8).join(", ");
                const sceneText = char.scenes.length > 8 ? `${preview}…` : preview;
                return (
                  <button
                    key={char.name}
                    onClick={() => {
                      const next = filterChar === char.name ? null : char.name;
                      setFilterChar(next);
                      if (next) {
                        setActiveScene(0);
                        requestAnimationFrame(() => {
                          const el = sceneRefs.current[0];
                          el?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                      } else {
                        setActiveScene(0);
                        requestAnimationFrame(() => viewerRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
                      }
                    }}
                    className={`flex-shrink-0 w-32 h-20 rounded-lg border bg-white px-3 py-2 text-left shadow-sm hover:bg-gray-50 ${
                      filterChar === char.name ? "bg-gray-100 font-bold" : ""
                    }`}
                  >
                    <span className="block rounded px-1 font-bold bg-gray-200 text-gray-800">{char.name}</span>
                    {char.actorName && (
                      <div className="mt-0.5 text-[10px] text-gray-500">{char.actorName}</div>
                    )}
                    <div className="mt-1 text-[10px] leading-tight text-gray-600">
                      <div>{char.sceneCount} scenes</div>
                      <div>{char.dialogueCount} dialogues</div>
                      <div
                        className="whitespace-nowrap overflow-hidden text-ellipsis"
                        title={`Scenes: ${char.scenes.join(", ")}`}
                      >
                        Scenes: {sceneText}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {!presentChars.length && !otherChars.length && (
          <div className="flex items-center text-sm text-gray-500">No characters</div>
        )}
      </div>
    </div>
  );
}

function SceneInfoPanel({
  scene,
  index,
  characters,
  onAssignActor,
  onUpdateScene,
  filmingStart,
  filmingEnd,
}: {
  scene: Scene;
  index: number;
  characters: CharacterStats[];
  onAssignActor?: (character: string, actorName: string, actorEmail: string) => void;
  onUpdateScene?: (index: number, partial: Partial<Scene>) => void;
  filmingStart?: string;
  filmingEnd?: string;
}) {
  const formatDuration = (secs?: number | string) => {
    const total = Number(secs);
    if (!Number.isFinite(total)) return "–";
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(total % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const cast: CharacterStats[] = scene.characters.map(
    (c) =>
      characters.find((ch) => ch.name === c) || {
        name: c,
        sceneCount: 0,
        dialogueCount: 0,
        scenes: [],
      },
  );

  const [dates, setDates] = useState<string[]>([]);
  useEffect(() => {
    fetch("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "calendar_suggest",
          arguments: { id: String(scene.sceneNumber), time: scene.time },
        },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        try {
          const text = data?.result?.content?.[0]?.text;
          if (text) setDates(JSON.parse(text).dates || []);
        } catch {
          setDates([]);
        }
      })
      .catch(() => setDates([]));
  }, [scene.sceneNumber, scene.time]);

  const [query, setQuery] = useState("");
  const [loc, setLoc] = useState<{ primary?: any; backups?: any[] }>({});
  function searchLocation() {
    fetch("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: "map_search", arguments: { query } },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        try {
          const text = data?.result?.content?.[0]?.text;
          if (text) setLoc(JSON.parse(text));
        } catch {
          setLoc({});
        }
      })
      .catch(() => setLoc({}));
  }

  function showSimilar() {
    if (!primary) return;
    fetch("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "map_similar",
          arguments: { lat: primary.lat, lon: primary.lon, query },
        },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        try {
          const text = data?.result?.content?.[0]?.text;
          if (text) setLoc((prev) => ({ ...prev, backups: JSON.parse(text).backups }));
        } catch {
          setLoc((prev) => ({ ...prev, backups: [] }));
        }
      })
      .catch(() => setLoc((prev) => ({ ...prev, backups: [] })));
  }

  function removeLocation(name: string) {
    const next = scene.shootingLocations.filter((n) => n !== name);
    onUpdateScene?.(index, { shootingLocations: next });
    if (loc.primary?.name === name) setLoc((prev) => ({ ...prev, primary: undefined }));
  }

  function toggleDate(d: string) {
    const exists = scene.shootingDates.some((x) => x.startsWith(d));
    const next = exists
      ? scene.shootingDates.filter((x) => !x.startsWith(d))
      : [...scene.shootingDates, d];
    onUpdateScene?.(index, { shootingDates: next });
  }

  function setTime(date: string, time: string) {
    const next = scene.shootingDates.map((d) => {
      const [dt] = d.split("T");
      return dt === date ? (time ? `${dt}T${time}` : dt) : d;
    });
    onUpdateScene?.(index, { shootingDates: next });
  }

  function computeEnd(date: string, time: string) {
    const duration = Number(scene.sceneDuration) || 0;
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + duration * 1000);
    return end.toISOString().slice(11, 16);
  }
  function selectLocation(l: any) {
    const exists = scene.shootingLocations.includes(l.name);
    const next = exists
      ? scene.shootingLocations.filter((n) => n !== l.name)
      : [...scene.shootingLocations, l.name];
    onUpdateScene?.(index, { shootingLocations: next });
    setLoc((prev) => ({ ...prev, primary: exists ? undefined : l }));
  }

  const primary = loc.primary;
  const backups = loc.backups as any[] | undefined;
  const selectedDate = scene.shootingDates[0]?.split("T")[0];
  const filteredAvailable = dates.filter(
    (d) =>
      (!filmingStart || d >= filmingStart) &&
      (!filmingEnd || d <= filmingEnd),
  );

  return (
    <div className="space-y-6 text-sm text-gray-700">
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Duration</h3>
        <p className="mt-1 text-base font-medium text-gray-900">
          {formatDuration(scene.sceneDuration)}
        </p>
      </div>
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Shooting Dates</h3>
        <Calendar
          available={filteredAvailable}
          selected={scene.shootingDates.map((d) => d.split("T")[0])}
          onToggle={toggleDate}
          min={filmingStart}
          max={filmingEnd}
        />
        {scene.shootingDates.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {scene.shootingDates.map((d) => {
              const [dt, tm] = d.split("T");
              const end = tm ? computeEnd(dt, tm) : "";
              return (
                <li
                  key={d}
                  className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs"
                >
                  <span>{dt}</span>
                  <input
                    type="time"
                    value={tm || ""}
                    onChange={(e) => setTime(dt, e.target.value)}
                    className="ml-1 w-20 rounded border px-1"
                  />
                  {tm && <span>– {end}</span>}
                  <button
                    type="button"
                    aria-label={`remove ${dt}`}
                    onClick={() => toggleDate(dt)}
                    className="ml-1 text-gray-600 hover:text-gray-900"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-gray-500">Not scheduled</p>
        )}
      </div>
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Shooting Locations</h3>
        <div className="mb-2 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded border px-2 py-1 text-xs"
            placeholder="Search location"
          />
          <button
            type="button"
            onClick={searchLocation}
            className="rounded bg-gray-200 px-2 text-xs"
          >
            Go
          </button>
        </div>
        <LocationMap
          location={primary}
          backups={backups}
          onSelect={selectLocation}
        />
        {primary && (
          <button
            type="button"
            onClick={showSimilar}
            className="mt-2 rounded bg-gray-200 px-2 py-1 text-xs"
          >
            Show similar locations
          </button>
        )}
        {scene.shootingLocations.length ? (
          <ul className="mt-2 space-y-1">
            {scene.shootingLocations.map((l) => (
              <li
                key={l}
                className="flex items-center justify-between rounded bg-green-100 px-2 py-1 text-xs"
              >
                <span>{l}</span>
                <button
                  type="button"
                  aria-label={`remove ${l}`}
                  onClick={() => removeLocation(l)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-gray-500">Unknown</p>
        )}
      </div>
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Weather</h3>
        <WeatherPanel
          lat={primary?.lat}
          lon={primary?.lon}
          date={selectedDate}
        />
      </div>
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Cast</h3>
        {cast.length ? (
          <ul className="mt-1 space-y-2">
            {cast.map((c) => (
              <li key={c.name}>
                <div className="font-bold text-gray-900">{c.name}</div>
                {c.actorName || c.actorEmail ? (
                  <div className="text-xs text-gray-600">
                    {c.actorName && <span>{c.actorName}</span>}
                      {c.actorName && c.actorEmail && <span> · </span>}
                      {c.actorEmail && <span>{c.actorEmail}</span>}
                    </div>
                  ) : onAssignActor ? (
                    <button
                      onClick={() => {
                        const actorName = prompt(`Actor name for ${c.name}`) || "";
                      const actorEmail = prompt(`Actor email for ${c.name}`) || "";
                      onAssignActor(c.name, actorName, actorEmail);
                    }}
                    className="mt-1 text-xs text-blue-600 underline"
                  >
                    Assign actor
                  </button>
                ) : (
                  <div className="text-xs text-gray-400">Unassigned</div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1">No characters</p>
        )}
      </div>
    </div>
  );
}

function Part({
  part,
  colorMap,
  highlight,
}: {
  part: ScenePart;
  colorMap: Record<string, string>;
  highlight: (text: string) => React.ReactNode[];
}) {
  if (part.type === "dialogue") {
    return (
      <div>
        <div className="mb-1 text-center">
          <span className={`rounded px-2 ${colorMap[part.character]} text-gray-800 font-bold`}>
            {part.character}
          </span>
        </div>
        <p className="text-center whitespace-pre-line">{part.text}</p>
      </div>
    );
  }
  return <p>{highlight(part.text)}</p>;
}
