import React, { useState } from "react";

interface Props {
  available: string[];
  selected?: string[];
  onToggle?: (date: string) => void;
}

function format(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function Calendar({ available, selected = [], onToggle }: Props) {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear();
  const month = current.getMonth();
  const first = new Date(year, month, 1);
  const start = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(start).fill(null);
  for (let d = 1; d <= days; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm font-medium">
        <button
          type="button"
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
          className="rounded px-2 py-1 hover:bg-gray-200"
        >
          ←
        </button>
        <span>
          {current.toLocaleString("default", { month: "long" })} {year}
        </span>
        <button
          type="button"
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
          className="rounded px-2 py-1 hover:bg-gray-200"
        >
          →
        </button>
      </div>
      <table className="w-full table-fixed text-center text-sm">
        <thead>
          <tr className="text-gray-500">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={i}>
              {w.map((day, j) => {
                if (!day) return <td key={j}></td>;
                const date = format(new Date(year, month, day));
                const availableDay = available.includes(date);
                const picked = selected.includes(date);
                return (
                  <td key={j} className="p-1">
                    <button
                      type="button"
                      onClick={() => availableDay && onToggle?.(date)}
                      className={`h-8 w-8 rounded-full border text-xs ${
                        availableDay
                          ? picked
                            ? "bg-blue-500 text-white hover:bg-blue-600"
                            : "bg-blue-200 hover:bg-blue-300"
                          : "text-gray-400"
                      }`}
                    >
                      {day}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
