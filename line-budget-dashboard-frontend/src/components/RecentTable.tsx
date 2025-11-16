// src/components/RecentTable.tsx

import type { DashboardResponse, RecentExpense } from "../api/dashboard";

interface RecentTableProps {
  items: DashboardResponse["recentExpenses"];
  onEdit: (expense: RecentExpense) => void;
  onDelete: (expense: RecentExpense) => void;
}

export function RecentTable({ items, onEdit, onDelete }: RecentTableProps) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
        本月還沒有任何記帳紀錄。
      </div>
    );
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/40">
      <h2 className="mb-3 text-sm font-semibold text-slate-50">最近支出</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.15em] text-slate-500">
            <tr>
              <th className="py-2 pr-3">時間</th>
              <th className="py-2 pr-3">分類</th>
              <th className="py-2 pr-3 text-right">金額</th>
              <th className="py-2 pr-3">備註</th>
              <th className="py-2 pr-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-800/60 last:border-b-0"
              >
                <td className="py-2 pr-3 text-[11px] text-slate-400">
                  {formatDateTime(item.spentAt)}
                </td>
                <td className="py-2 pr-3 text-xs">
                  {item.categoryName ?? "未分類"}
                </td>
                <td className="py-2 pr-3 text-right text-xs text-emerald-300">
                  {item.amount.toLocaleString()}
                </td>
                <td className="py-2 pr-3 text-xs text-slate-400">
                  {item.note ?? "—"}
                </td>
                <td className="py-2 pr-3 text-right text-xs">
                  <button
                    onClick={() => onEdit(item)}
                    className="mr-2 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-slate-500 hover:bg-slate-800"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="rounded-md border border-red-500/60 px-2 py-1 text-[11px] text-red-300 hover:border-red-400 hover:bg-red-500/10"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentTable;
