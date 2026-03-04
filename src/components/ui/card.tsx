import { PropsWithChildren } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-white/90 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}
