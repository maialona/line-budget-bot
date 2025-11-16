// src/api/dashboard.ts

export interface DashboardResponse {
  user: {
    id: number;
    lineUserId: string;
    displayName: string | null;
    currency: string;
    monthlyBudgetAmount: number | null;
  };
  period: {
    type: "month";
    start: string;
    end: string;
  };
  summary: {
    totalExpense: number;
    budget: number | null;
    remaining: number | null;
    isOverBudget: boolean;
    expenseCount: number;
  };
  byCategory: {
    categoryName: string;
    total: number;
    percent: number;
  }[];
  dailySeries: {
    date: string;
    total: number;
  }[];
  recentExpenses: {
    id: number;
    spentAt: string;
    categoryName: string;
    amount: number;
    note: string | null;
  }[];
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("line_budget_token");
}

// 抓 Dashboard 資料
export async function fetchDashboard(
  tokenOverride?: string
): Promise<DashboardResponse> {
  const token = tokenOverride ?? getAuthToken();
  if (!token) {
    throw new Error("unauthorized");
  }

  const res = await fetch("/api/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    },
  });

  if (res.status === 401) {
    throw new Error("unauthorized");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard");
  }

  return res.json();
}

// 更新每月預算
export async function updateMonthlyBudget(
  token: string,
  monthlyBudgetAmount: number | null
): Promise<{ monthlyBudgetAmount: number | null }> {
  const res = await fetch("/api/user/budget", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({ monthlyBudgetAmount }),
  });

  if (!res.ok) {
    throw new Error("update_budget_failed");
  }

  return res.json();
}

// 方便型別使用：單筆「最近支出」的型別
export type RecentExpense = DashboardResponse["recentExpenses"][number];

export async function updateExpense(
  token: string,
  id: number,
  payload: { amount: number; note: string | null }
): Promise<RecentExpense> {
  const res = await fetch(`/api/expenses/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    throw new Error("unauthorized");
  }

  if (!res.ok) {
    throw new Error("update_expense_failed");
  }

  return res.json();
}

export async function deleteExpense(token: string, id: number): Promise<void> {
  const res = await fetch(`/api/expenses/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    throw new Error("unauthorized");
  }

  if (!res.ok && res.status !== 204) {
    throw new Error("delete_expense_failed");
  }
}
