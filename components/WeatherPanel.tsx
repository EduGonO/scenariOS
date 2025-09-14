import React, { useEffect, useState } from "react";

interface Props {
  lat?: number;
  lon?: number;
  date?: string; // YYYY-MM-DD
}

export default function WeatherPanel({ lat, lon, date }: Props) {
  const [info, setInfo] = useState<{
    max?: number;
    min?: number;
    rain?: number;
    clouds?: number;
    visibility?: number;
    chance?: number;
    sunrise?: string;
    sunset?: string;
  } | null>(null);

  useEffect(() => {
    if (!lat || !lon || !date) return;
    const controller = new AbortController();
    fetch("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "weather_forecast",
          arguments: { lat, lon, date },
        },
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        try {
          const text = data?.result?.content?.[0]?.text;
          if (text) setInfo(JSON.parse(text));
        } catch {
          setInfo(null);
        }
      })
      .catch(() => setInfo(null));
    return () => controller.abort();
  }, [lat, lon, date]);

  if (!lat || !lon || !date)
    return <div className="text-gray-500">Select date & location</div>;
  if (!info) return <div className="text-gray-500">No forecast</div>;
  const goldenStart = info.sunrise ? new Date(info.sunrise) : null;
  const goldenEnd = info.sunset ? new Date(info.sunset) : null;
  if (goldenStart) goldenStart.setMinutes(goldenStart.getMinutes() + 60);
  if (goldenEnd) goldenEnd.setMinutes(goldenEnd.getMinutes() - 60);
  return (
    <div className="space-y-1 text-xs">
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <span>
          🌡️ {info.max}°/{info.min}°
        </span>
        {info.clouds !== undefined && <span>☁️ {info.clouds.toFixed(0)}%</span>}
        {info.visibility !== undefined && (
          <span>👁️ {(info.visibility / 1000).toFixed(1)} km</span>
        )}
        {info.chance !== undefined && <span>🌧️ {info.chance}%</span>}
        {info.rain !== undefined && <span>💧 {info.rain} mm</span>}
      </div>
      {goldenStart && goldenEnd && (
        <div>
          🌅
          {goldenStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –
          {goldenEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}
