import React from "react";

interface Location {
  name: string;
  lat: number;
  lon: number;
  distanceKm?: number;
}

interface Props {
  location?: Location;
  backups?: Location[];
  onSelect?: (loc: Location) => void;
}

export default function LocationMap({ location, backups, onSelect }: Props) {
  const src = location
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${location.lon - 0.01},${location.lat - 0.01},${location.lon + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lon}`
    : undefined;
  return (
    <div className="space-y-2">
      {src ? (
        <iframe
          src={src}
          className="h-40 w-full rounded"
          loading="lazy"
        />
      ) : (
        <div className="text-gray-500">No location selected</div>
      )}
      {backups && backups.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Backups (distance from chosen)
          </h4>
          <ul className="mt-1 space-y-1 text-xs">
            {backups.map((b) => (
              <li key={b.name} className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelect?.(b)}
                  className="flex-1 text-left text-blue-600 underline"
                >
                  {b.name}
                </button>
                {typeof b.distanceKm === "number" && (
                  <span className="ml-2 text-gray-500">
                    {b.distanceKm.toFixed(1)} km
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
