"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Capture" },
  { href: "/agents", label: "Agents" },
  { href: "/dashboard", label: "Dashboard" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pb-3 pt-4 md:px-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Capture Command</h1>
        <p className="text-xs text-slate-500">central runtime for writing + agent execution</p>
      </div>

      <nav className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/90 p-1">
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
