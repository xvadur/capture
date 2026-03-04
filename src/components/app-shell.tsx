"use client";

import { AppStateProvider } from "@/components/app-state-provider";
import { StickyMetricsBar } from "@/components/sticky-metrics-bar";
import { TopNav } from "@/components/top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <div className="min-h-screen bg-[var(--bg)]">
        <TopNav />
        <StickyMetricsBar />
        <main className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">{children}</main>
      </div>
    </AppStateProvider>
  );
}
