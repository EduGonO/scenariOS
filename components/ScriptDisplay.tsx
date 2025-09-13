import React, { useMemo, useState } from 'react';
import { Scene, ScenePart } from '../utils/parseScript';

interface Props {
  scenes: Scene[];
  characters: string[];
}

const COLORS = [
  'text-red-600',
  'text-blue-600',
  'text-green-600',
  'text-purple-600',
  'text-yellow-600',
  'text-pink-600',
  'text-indigo-600',
  'text-teal-600',
  'text-orange-600',
];

export default function ScriptDisplay({ scenes, characters }: Props) {
  const [activeScene, setActiveScene] = useState<number>(0);
  const [filterChar, setFilterChar] = useState<string | null>(null);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    characters.forEach((c, i) => {
      map[c] = COLORS[i % COLORS.length];
    });
    return map;
  }, [characters]);

  const filteredScenes = filterChar
    ? scenes.filter((s) => s.characters.includes(filterChar))
    : scenes;

  const active = filteredScenes[activeScene];

  function highlight(text: string) {
    const tokens = text.split(/(\s+)/);
    return tokens.map((tok, idx) => {
      const plain = tok.replace(/[^A-Z0-9']/g, '');
      if (colorMap[plain]) {
        return (
          <span key={idx} className={`font-semibold ${colorMap[plain]}`}>
            {tok}
          </span>
        );
      }
      return tok;
    });
  }

  if (!scenes.length) return null;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-1 h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white">
        {filteredScenes.map((scene, idx) => (
          <button
            key={idx}
            onClick={() => setActiveScene(idx)}
            className={`block w-full border-b px-4 py-2 text-left hover:bg-gray-50 ${
              activeScene === idx ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            {scene.number ? `${scene.number}. ` : ''}
            {scene.heading}
          </button>
        ))}
      </div>
      <div className="col-span-1 h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white">
        {characters.map((char) => (
          <button
            key={char}
            onClick={() => {
              setFilterChar((prev) => (prev === char ? null : char));
              setActiveScene(0);
            }}
            className={`block w-full border-b px-4 py-2 text-left hover:bg-gray-50 ${
              filterChar === char ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            <span className={colorMap[char]}>{char}</span>
          </button>
        ))}
      </div>
      <div className="col-span-3">
        {active ? (
          <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              {active.number ? `${active.number}. ` : ''}
              {active.heading}
            </h2>
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
        <div
          className={`text-center font-semibold ${colorMap[part.character]}`}
        >
          {part.character}
        </div>
        <p className="text-center whitespace-pre-line">{part.text}</p>
      </div>
    );
  }
  return <p>{highlight(part.text)}</p>;
}

