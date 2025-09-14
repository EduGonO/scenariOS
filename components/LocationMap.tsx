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
  const markers: string[] = [];
  if (location) markers.push(`${location.lat},${location.lon},red`);
  backups?.forEach((b) => markers.push(`${b.lat},${b.lon},blue`));
  const markerParams = markers.map((m) => `markers=${m}`).join("&");
  const src =
    location && markerParams
      ? `https://staticmap.openstreetmap.de/staticmap.php?center=${location.lat},${location.lon}&zoom=14&size=600x300&${markerParams}`
      : undefined;
  return (
    <div className="space-y-2">
      {location && src ? (
        <img src={src} alt="map" className="h-48 w-full rounded object-cover" />
      ) : (
        <div className="text-gray-500">No location selected</div>
      )}
      {backups && backups.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Backups</h4>
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
                  <span className="ml-2 text-gray-500">{b.distanceKm.toFixed(1)} km</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
