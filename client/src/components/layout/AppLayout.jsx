export function AppLayout({ sidebar, children }) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      {sidebar}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
