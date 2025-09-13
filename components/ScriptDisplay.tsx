import React, { useMemo, useState } from 'react';
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
  const [activeScene, setActiveScene] = useState<number>(0);
  const [filterChar, setFilterChar] = useState<string | null>(null);

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

  const active = filteredScenes[activeScene];

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

  if (!scenes.length) return null;

    return (
      <div
        className="grid grid-cols-5 gap-6"
        style={{ fontFamily: 'Courier, monospace' }}
      >
        <div className="col-span-1 h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white">
          {filteredScenes.map((scene, idx) => {
            const originalIdx = scenes.indexOf(scene);
            const displayNumber = scene.number || originalIdx + 1;
            const match = scene.heading.match(/^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.)(.*)$/i);
            const type = match ? match[1].toUpperCase() : '';
            const rest = match ? match[2].trim() : scene.heading;
            return (
              <button
                key={idx}
                onClick={() => setActiveScene(idx)}
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
        <div className="col-span-1 h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white">
          {characters.map((char) => (
            <button
              key={char.name}
              onClick={() => {
                setFilterChar((prev) => (prev === char.name ? null : char.name));
                setActiveScene(0);
              }}
              className={`block w-full border-b px-4 py-3 text-left hover:bg-gray-50 ${
                filterChar === char.name ? 'bg-gray-100 font-medium' : ''
              }`}
            >
              <span
                className={`rounded px-1 font-semibold ${colorMap[char.name]} text-gray-800`}
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
        <div className="col-span-3">
          {active ? (
            <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              {(() => {
                const originalIdx = scenes.indexOf(active);
                const displayNumber = active.number || originalIdx + 1;
                return (
                  <h2 className="mb-4 text-lg font-semibold text-gray-800">
                    {displayNumber}. {active.heading}
                  </h2>
                );
              })()}
              <div className="space-y-4 text-gray-700">
                {active.parts.map((part, idx) => (
                  <Part key={idx} part={part} colorMap={colorMap} highlight={highlight} />
                ))}
              </div>
          </div>
        ) : (
          <p className="text-gray-500">Select a scene to view its content.</p>
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

