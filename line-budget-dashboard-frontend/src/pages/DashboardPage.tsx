// src/pages/DashboardPage.tsx

import { useEffect, useState } from "react";
import {
  DashboardResponse,
  fetchDashboard,
  updateMonthlyBudget,
  updateExpense,
  deleteExpense,
  RecentExpense,
} from "../api/dashboard";
import { SummaryCards } from "../components/SummaryCards";
import { CategoryChart } from "../components/CategoryChart";
import { DailyChart } from "../components/DailyChart";
import { RecentTable } from "../components/RecentTable";
import BudgetSettings from "../components/BudgetSettings";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("line_budget_token");
}

function saveToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("line_budget_token", token);
}

function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("line_budget_token");
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());

  // 編輯 / 刪除相關 state
  const [editing, setEditing] = useState<RecentExpense | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleEditClick = (exp: RecentExpense) => {
    setEditing(exp);
    setEditAmount(String(exp.amount));
    setEditNote(exp.note ?? "");
  };

  const handleDeleteClick = async (exp: RecentExpense) => {
    if (!token) return;
    if (!window.confirm("確定要刪除這筆記帳嗎？")) return;

    try {
      setDeletingId(exp.id);
      await deleteExpense(token, exp.id);
      const refreshed = await fetchDashboard(token);
      setData(refreshed);
    } catch (err) {
      console.error(err);
      alert("刪除失敗，請稍後再試一次。");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!token || !editing) return;

    const amountNum = Number(editAmount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      alert("金額需為大於等於 0 的數字。");
      return;
    }

    try {
      setSavingEdit(true);
      await updateExpense(token, editing.id, {
        amount: amountNum,
        note: editNote.trim() === "" ? null : editNote.trim(),
      });

      const refreshed = await fetchDashboard(token);
      setData(refreshed);
      setEditing(null);
    } catch (err) {
      console.error(err);
      alert("儲存失敗，請稍後再試一次。");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(null);
  };

  // 1) 處理從後端 redirect 回來的 ?token / ?login_error
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const tokenFromUrl = url.searchParams.get("token");
    const loginError = url.searchParams.get("login_error");

    let updated = false;

    if (tokenFromUrl) {
      saveToken(tokenFromUrl);
      setToken(tokenFromUrl);
      url.searchParams.delete("token");
      updated = true;
    }

    if (loginError) {
      setError("LINE 登入失敗，請再試一次。");
      url.searchParams.delete("login_error");
      updated = true;
    }

    if (updated) {
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // 2) 只要 token 有變化，就重新抓 Dashboard
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchDashboard(token)
      .then((d) => setData(d))
      .catch((err) => {
        if (err.message === "unauthorized") {
          clearToken();
          setToken(null);
          setError("尚未登入或登入已過期，請重新登入。");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleLoginClick = () => {
    // Vite dev 會把這個 proxy 到 http://localhost:3000/auth/line/login
    window.location.href = "/auth/line/login";
  };

  const handleLogoutClick = () => {
    clearToken();
    setToken(null);
    setData(null);
  };

  // ================= UI =================

  if (!token) {
    // 尚未登入 → 顯示登入提示畫面
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-xl shadow-slate-950/60">
          <h2 className="text-lg font-semibold text-slate-50">
            使用 LINE 登入以查看記帳 Dashboard
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            我們會使用 LINE Login 確認你的身分，並連動你在 Bot 上的記帳資料。
          </p>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button
            onClick={handleLoginClick}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400"
          >
            使用 LINE 登入
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-slate-400">
        讀取中...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-sm text-red-100">
          讀取資料時發生錯誤：{error ?? "未知錯誤"}
          <div className="mt-3 text-right">
            <button
              onClick={handleLogoutClick}
              className="text-xs text-red-200 underline underline-offset-4"
            >
              登出並重新登入
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    data.user.displayName ||
    (data.user.lineUserId
      ? `使用者 ${data.user.lineUserId.slice(0, 6)}`
      : "記帳者");

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/80">
              已登入
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-50">
              嗨，{displayName} 👋
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              這是你本月透過 Line 記帳的支出總覽。
            </p>
          </div>
          <button
            onClick={handleLogoutClick}
            className="rounded-xl border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100"
          >
            登出
          </button>
        </div>

        {/* 上方 Summary 卡片 */}
        <SummaryCards summary={data.summary} currency={data.user.currency} />

        {/* 中間圖表 + 右側預算設定 */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <CategoryChart items={data.byCategory} />
              <DailyChart points={data.dailySeries} />
            </div>

            <RecentTable
              items={data.recentExpenses}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          </div>

          <BudgetSettings
            currency={data.user.currency}
            initialBudget={data.user.monthlyBudgetAmount}
            onSave={async (newBudget) => {
              if (!token) return;

              try {
                // 1. 先打 /api/user/budget 更新後端
                const result = await updateMonthlyBudget(token, newBudget);

                // 2. 先把本地 user.monthlyBudgetAmount 更新，讓卡片立刻反應
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        user: {
                          ...prev.user,
                          monthlyBudgetAmount: result.monthlyBudgetAmount,
                        },
                      }
                    : prev
                );

                // 3. 再重新抓一次 Dashboard，讓「剩餘可花」等數字也一併更新
                const refreshed = await fetchDashboard(token);
                setData(refreshed);
              } catch (err) {
                console.error("[DashboardPage] update budget failed", err);
                setError("更新預算失敗，請稍後再試。");
              }
            }}
          />
        </div>
      </div>

      {/* 編輯支出 Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <h2 className="text-sm font-semibold text-slate-50">
              編輯記帳紀錄
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(editing!.spentAt).toLocaleString("zh-TW")}
              {" ｜ "}
              {editing!.categoryName ?? "未分類"}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  金額
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  備註
                </label>
                <textarea
                  className="h-20 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-400 hover:bg-slate-800"
                disabled={savingEdit}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                disabled={savingEdit}
              >
                {savingEdit ? "儲存中…" : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
