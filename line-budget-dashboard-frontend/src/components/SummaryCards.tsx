interface SummaryProps {
  summary: {
    totalExpense: number;
    budget: number | null;
    remaining: number | null;
    isOverBudget: boolean;
    expenseCount: number;
  };
  currency: string;
}

function formatAmount(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("zh-TW");
}

export function SummaryCards({ summary, currency }: SummaryProps) {
  const { totalExpense, budget, remaining, isOverBudget, expenseCount } =
    summary;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm shadow-slate-950/60">
        <p className="text-xs text-slate-400">本月總支出</p>
        <p className="mt-2 text-2xl font-semibold">
          {formatAmount(totalExpense)}
          <span className="ml-1 text-xs text-slate-400">{currency}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs text-slate-400">本月預算</p>
        <p className="mt-2 text-xl font-semibold">
          {budget ? formatAmount(budget) : "尚未設定"}
          {budget && (
            <span className="ml-1 text-xs text-slate-400">{currency}</span>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs text-slate-400">
          {isOverBudget ? "已超出預算" : "剩餘可花"}
        </p>
        <p
          className={`mt-2 text-xl font-semibold ${
            isOverBudget ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {remaining != null ? formatAmount(Math.abs(remaining)) : "-"}
          {remaining != null && (
            <span className="ml-1 text-xs text-slate-400">{currency}</span>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs text-slate-400">本月記帳筆數</p>
        <p className="mt-2 text-2xl font-semibold">{expenseCount}</p>
      </div>
    </div>
  );
}
