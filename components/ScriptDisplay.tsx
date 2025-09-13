import React, { useState } from 'react';
import { Scene } from '../utils/parseScript';

interface Props {
  scenes: Scene[];
}

export default function ScriptDisplay({ scenes }: Props) {
  const [active, setActive] = useState<number | null>(0);

  if (!scenes.length) return null;

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="col-span-1 h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white">
        {scenes.map((scene, idx) => (
          <button
            key={idx}
            onClick={() => setActive(idx)}
            className={`block w-full border-b px-4 py-2 text-left hover:bg-gray-50 ${
              active === idx ? 'bg-gray-100 font-medium' : ''
            }`}
          >
            {scene.number ? `${scene.number}. ` : ''}
            {scene.heading}
          </button>
        ))}
      </div>
      <div className="col-span-3">
        {active !== null ? (
          <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              {scenes[active].number ? `${scenes[active].number}. ` : ''}
              {scenes[active].heading}
            </h2>
            <pre className="whitespace-pre-wrap text-gray-700">
              {scenes[active].lines.join('\n')}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500">Select a scene to view its content.</p>
        )}
      </div>
    </div>
  );
}
