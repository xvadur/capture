"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PhasesBarChart({
  data,
}: {
  data: Array<{ phase: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="88%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="phase" stroke="#64748b" />
        <YAxis allowDecimals={false} stroke="#64748b" />
        <Tooltip />
        <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
