import React from 'react';
import { Scene } from '../utils/parseScript';

interface Props {
  scenes: Scene[];
}

export default function ScriptDisplay({ scenes }: Props) {
  if (!scenes.length) return null;
  return (
    <div className="space-y-8">
      {scenes.map((scene, idx) => (
        <div key={idx} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            {scene.number ? `${scene.number}. ` : ''}{scene.heading}
          </h2>
          <pre className="whitespace-pre-wrap text-gray-700">
            {scene.lines.join('\n')}
          </pre>
        </div>
      ))}
    </div>
  );
}
