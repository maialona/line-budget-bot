// src/components/BudgetSettings.tsx
import { useEffect, useState } from "react";

type Props = {
  currency: string;
  initialBudget: number | null;
  // 這個會由 DashboardPage 傳進來，裡面會 call updateMonthlyBudget
  onSave: (budget: number | null) => Promise<void> | void;
};

export default function BudgetSettings({
  currency,
  initialBudget,
  onSave,
}: Props) {
  const [value, setValue] = useState(
    initialBudget != null ? String(initialBudget) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 如果 parent 把 initialBudget 更新了（例如重新 fetch dashboard），同步到 input
  useEffect(() => {
    setValue(initialBudget != null ? String(initialBudget) : "");
  }, [initialBudget]);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setValue(e.target.value);
  };

  const handleSaveClick = async () => {
    setError(null);

    const trimmed = value.trim();
    const budget = trimmed === "" ? null : Number(trimmed.replace(/,/g, ""));

    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      setError("請輸入大於等於 0 的數字，或留空代表不設上限。");
      return;
    }

    setSaving(true);
    try {
      // 這裡一定會呼叫到 DashboardPage 傳進來的 onSave
      await onSave(budget);
    } catch (err) {
      console.error("[BudgetSettings] save failed", err);
      setError("儲存預算失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/40">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-50">本月預算設定</h2>
          <p className="mt-1 text-xs text-slate-400">
            設定後，會用來計算「剩餘可花」與是否超支。
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-right text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
          placeholder="例如 15000，留空代表未設定"
          value={value}
          onChange={handleChange}
          disabled={saving}
        />
        <span className="text-xs text-slate-400">{currency}</span>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={saving}
          className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-xs font-medium text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "儲存中…" : "儲存預算"}
        </button>
      </div>
    </div>
  );
}
