import React from "react";

interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  location?: Location;
  backups?: Location[];
  onSelect?: (loc: Location) => void;
}

export default function LocationMap({ location, backups, onSelect }: Props) {
  const bbox = location
    ? `${location.lon - 0.01},${location.lat - 0.01},${location.lon + 0.01},${
        location.lat + 0.01
      }`
    : undefined;
  return (
    <div className="space-y-2">
      {location ? (
        <iframe
          title="map"
          className="h-48 w-full rounded"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat},${location.lon}`}
        />
      ) : (
        <div className="text-gray-500">No location selected</div>
      )}
      {backups && backups.length > 0 && (
        <ul className="space-y-1 text-xs text-blue-600 underline">
          {backups.map((b) => (
            <li key={b.name}>
              <button type="button" onClick={() => onSelect?.(b)}>
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
