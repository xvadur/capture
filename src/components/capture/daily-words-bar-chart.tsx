"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendDayPoint } from "@/lib/types";

function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

export function DailyWordsBarChart({ points }: { points: TrendDayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="88%">
      <BarChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" tickFormatter={formatDay} stroke="#64748b" fontSize={12} interval={4} />
        <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
        <Tooltip
          labelFormatter={(value) => formatDay(String(value))}
          formatter={(value, name) => {
            if (name === "uniqueWords") {
              return [`${value}`, "Unique Words"];
            }
            if (name === "captures") {
              return [`${value}`, "Captures"];
            }
            return [`${value}`, "Words"];
          }}
          contentStyle={{ borderRadius: 10, border: "1px solid #cbd5e1" }}
        />
        <Bar dataKey="words" fill="#0f766e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
