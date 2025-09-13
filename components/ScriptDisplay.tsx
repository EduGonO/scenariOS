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
  const viewerRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<HTMLDivElement[]>([]);
  const interacted = useRef(false);

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

  const navScene = activeScene !== null ? filteredScenes[activeScene] : null;
  const navOriginalIdx = navScene ? scenes.indexOf(navScene) : null;
  const navDisplayNumber =
    navScene && navOriginalIdx !== null
      ? navScene.number || navOriginalIdx + 1
      : null;
  const navMatch = navScene
    ? navScene.heading.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)(.*)$/i)
    : null;
  const navType = navMatch ? navMatch[1].toUpperCase() : '';
  const navRest = navMatch ? navMatch[2].trim() : navScene?.heading;

  useEffect(() => {
    if (!viewerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!interacted.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveScene(idx);
          }
        });
      },
      { root: viewerRef.current, threshold: 0.5 }
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
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">
        {filterChar ? (
          <>
            Scenes with <span className="font-semibold text-gray-700">{filterChar}</span>
          </>
        ) : navScene ? (
          <>
            <span className="font-semibold text-gray-700">{`${navDisplayNumber}. ${navRest}`}</span>
            {navType && (
              <span className="rounded bg-gray-200 px-1 text-xs font-semibold text-gray-700">{navType}</span>
            )}
            <div className="flex flex-wrap gap-1">
              {navScene.characters.map((c) => (
                <span
                  key={c}
                  className={`rounded px-1 text-xs font-medium ${colorMap[c]} text-gray-800`}
                >
                  {c}
                </span>
              ))}
            </div>
          </>
        ) : (
          'All Scenes'
        )}
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
                  interacted.current = true;
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
          onScroll={() => {
            interacted.current = true;
          }}
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
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-700">{`${displayNumber}. ${rest}`}</span>
                  {type && (
                    <span className="rounded bg-gray-200 px-1 text-xs font-semibold text-gray-700">
                      {type}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1">
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
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {displayedChars.map((char) => (
          <button
            key={char.name}
            onClick={() => {
              const next = filterChar === char.name ? null : char.name;
              setFilterChar(next);
              interacted.current = false;
              setActiveScene(null);
              if (next) {
                setTimeout(() => {
                  sceneRefs.current[0]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }, 0);
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
        ))}
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

