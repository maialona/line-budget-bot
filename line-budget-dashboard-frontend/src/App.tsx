import { DashboardPage } from "./pages/DashboardPage";

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/90 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40">
              ￥
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Line 記帳 Dashboard
              </h1>
              <p className="text-xs text-slate-400">
                連動 Line Bot 的個人收支儀表板
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6">
        <DashboardPage />
      </main>
    </div>
  );
}
