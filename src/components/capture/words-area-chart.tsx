"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MetricPoint } from "@/lib/types";

function formatSlot(iso: string): string {
  const date = new Date(iso);
  return `${date.getHours().toString().padStart(2, "0")}:00`;
}

export function WordsAreaChart({ points }: { points: MetricPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="88%">
      <AreaChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="wordsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="slot" tickFormatter={formatSlot} stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
        <Tooltip
          labelFormatter={(value) => formatSlot(String(value))}
          formatter={(value) => [`${value}`, "Words"]}
          contentStyle={{ borderRadius: 10, border: "1px solid #cbd5e1" }}
        />
        <Area type="monotone" dataKey="words" stroke="#0f766e" fill="url(#wordsFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
