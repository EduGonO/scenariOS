import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Scene,
  ScenePart,
  CharacterStats,
  cleanName,
} from '../utils/parseScript';

interface Props {
  scenes: Scene[];
  characters: CharacterStats[];
}

const COLORS = [
  'bg-red-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-purple-200',
  'bg-yellow-200',
  'bg-pink-200',
  'bg-indigo-200',
  'bg-teal-200',
  'bg-orange-200',
];

export default function ScriptDisplay({ scenes, characters }: Props) {
  const [activeScene, setActiveScene] = useState<number | null>(null);
  const [filterChar, setFilterChar] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<HTMLDivElement[]>([]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    characters.forEach((c, i) => {
      map[c.name] = COLORS[i % COLORS.length];
    });
    return map;
  }, [characters]);

  const filteredScenes = filterChar
    ? scenes.filter((s) => s.characters.includes(filterChar))
    : scenes;

  useEffect(() => {
    if (!filterChar) setShowReset(false);
  }, [filterChar]);

  useEffect(() => {
    if (!viewerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveScene(idx);
          }
        });
      },
      { root: viewerRef.current, threshold: 0, rootMargin: '0px 0px -80% 0px' }
    );

    sceneRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredScenes]);

  function normalize(tok: string) {
    return cleanName(tok.toUpperCase()).replace(/'S?$/, '');
  }

  function highlight(text: string) {
    const tokens = text.split(/(\s+)/);
    return tokens.map((tok, idx) => {
      const base = normalize(tok);
      if (colorMap[base]) {
        return (
          <span
            key={idx}
            className={`rounded px-1 font-semibold ${colorMap[base]} text-gray-800`}
          >
            {tok}
          </span>
        );
      }
      return tok;
    });
  }

  const displayedChars = useMemo(() => {
    if (filterChar) {
      const set = new Set<string>();
      filteredScenes.forEach((s) => s.characters.forEach((c) => set.add(c)));
      return characters.filter((c) => set.has(c.name));
    }
    if (activeScene !== null) {
      const sceneChars = filteredScenes[activeScene]?.characters || [];
      return characters.filter((c) => sceneChars.includes(c.name));
    }
    return characters;
  }, [characters, filteredScenes, activeScene, filterChar]);

  if (!scenes.length) return null;

  sceneRefs.current = [];

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ fontFamily: 'Courier, monospace' }}
    >
      <div className="mb-4 flex justify-center">
        <div className="relative">
          <button
            onClick={() => filterChar && setShowReset((v) => !v)}
            className="rounded-full bg-white/70 px-5 py-1.5 text-sm font-medium text-gray-800 shadow-sm backdrop-blur transition hover:bg-white/90"
          >
            {filterChar ? (
              <>
                Scenes with <span className="font-semibold">{filterChar}</span> ({
                  filteredScenes.length
                })
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
                setActiveScene(null);
                setShowReset(false);
              }}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white shadow"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="w-56 flex-shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white">
          {filteredScenes.map((scene, idx) => {
            const originalIdx = scenes.indexOf(scene);
            const displayNumber = scene.number || originalIdx + 1;
            const match = scene.heading.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)(.*)$/i);
            const type = match ? match[1].toUpperCase() : '';
            const rest = match ? match[2].trim() : scene.heading;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveScene(idx);
                  sceneRefs.current[idx]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
                className={`block w-full border-b px-4 py-3 text-left hover:bg-gray-50 ${
                  activeScene === idx ? 'bg-gray-100 font-medium' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{displayNumber}</span>
                  {type && (
                    <span className="rounded bg-gray-200 px-1 text-[10px] font-semibold text-gray-700">
                      {type}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-700">{rest}</div>
              </button>
            );
          })}
        </div>
        <div
          ref={viewerRef}
          className="flex-1 overflow-y-auto p-6 space-y-8"
        >
          {filteredScenes.map((scene, idx) => {
            const originalIdx = scenes.indexOf(scene);
            const displayNumber = scene.number || originalIdx + 1;
            const match = scene.heading.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)(.*)$/i);
            const type = match ? match[1].toUpperCase() : '';
            const rest = match ? match[2].trim() : scene.heading;
            return (
              <div
                key={idx}
                ref={(el) => {
                  if (el) sceneRefs.current[idx] = el;
                }}
                data-index={idx}
                className="relative"
              >
                <div className="sticky top-0 z-10 rounded-b-xl border-b border-gray-200 bg-white/60 px-6 py-3 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">{`${displayNumber}. ${rest}`}</span>
                    {type && (
                      <span className="rounded bg-gray-200 px-1 text-xs font-semibold text-gray-700">
                        {type}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
                      {scene.characters.map((c) => (
                        <span
                          key={c}
                          className={`rounded px-1 text-xs font-medium ${colorMap[c]} text-gray-800`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="space-y-4 text-gray-700">
                    {scene.parts.map((part, pIdx) => (
                      <Part
                        key={pIdx}
                        part={part}
                        colorMap={colorMap}
                        highlight={highlight}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2 min-h-[7rem]">
        {filterChar && (
          <button
            onClick={() => {
              setFilterChar(null);
              setActiveScene(null);
            }}
            className="flex-shrink-0 rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Reset
          </button>
        )}
        {displayedChars.length ? (
          displayedChars.map((char) => (
            <button
              key={char.name}
              onClick={() => {
                const next = filterChar === char.name ? null : char.name;
                setFilterChar(next);
                if (next) {
                  setActiveScene(0);
                  setTimeout(() => {
                    sceneRefs.current[0]?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }, 0);
                } else {
                  setActiveScene(null);
                }
              }}
              className={`flex-shrink-0 rounded-lg border bg-white px-3 py-2 text-left hover:bg-gray-50 ${
                filterChar === char.name ? 'bg-gray-100 font-medium' : ''
              }`}
            >
              <span
                className={`block rounded px-1 font-semibold ${colorMap[char.name]} text-gray-800`}
              >
                {char.name}
              </span>
              <div className="mt-1 text-xs text-gray-600">
                <div>{char.sceneCount} scenes</div>
                <div>{char.dialogueCount} dialogues</div>
              </div>
            </button>
          ))
        ) : (
          <div className="flex items-center text-sm text-gray-500">
            No characters
          </div>
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
  if (part.type === 'dialogue') {
    return (
      <div>
        <div className="mb-1 text-center">
          <span
            className={`rounded px-2 ${colorMap[part.character]} text-gray-800 font-semibold`}
          >
            {part.character}
          </span>
        </div>
        <p className="text-center whitespace-pre-line">{part.text}</p>
      </div>
    );
  }
  return <p>{highlight(part.text)}</p>;
}

