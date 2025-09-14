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
    code?: number;
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
  return (
    <div className="text-sm">
      <div>
        High {info.max}°C / Low {info.min}°C
      </div>
      <div>Code: {info.code}</div>
    </div>
  );
}
