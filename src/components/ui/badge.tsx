import { PropsWithChildren } from "react";

export function Badge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "ok" | "warn" | "danger" }>) {
  const toneClass = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    ok: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warn: "bg-amber-100 text-amber-800 border-amber-200",
    danger: "bg-rose-100 text-rose-800 border-rose-200",
  }[tone];

  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${toneClass}`}>{children}</span>;
}
