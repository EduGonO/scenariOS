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
      className="grid grid-cols-5 grid-rows-[1fr_auto] gap-6"
      style={{ fontFamily: 'Courier, monospace' }}
    >
      <div className="col-span-1 row-span-1 h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white">
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
        className="col-span-4 row-span-1 h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 space-y-8"
      >
        {filteredScenes.map((scene, idx) => {
          const originalIdx = scenes.indexOf(scene);
          const displayNumber = scene.number || originalIdx + 1;
          return (
            <div
              key={idx}
              ref={(el) => {
                if (el) sceneRefs.current[idx] = el;
              }}
              data-index={idx}
              className="space-y-4"
            >
              <div className="text-sm text-gray-500">{displayNumber}</div>
              <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">{scene.heading}</h2>
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
      <div className="col-span-5 row-start-2 flex gap-4 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4">
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
            className={`flex-shrink-0 rounded-lg border px-3 py-2 text-left hover:bg-gray-50 ${
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

