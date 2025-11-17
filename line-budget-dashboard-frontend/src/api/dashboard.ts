// src/api/dashboard.ts

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "";

/* ========= 型別 ========= */

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
  recentExpenses: RecentExpense[];
}

export interface RecentExpense {
  id: number;
  spentAt: string; // ISO string
  categoryName: string;
  amount: number;
  note: string | null;
}

/* ========= 共用：取得 token ========= */

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("line_budget_token");
}

/* ========= Dashboard 相關 ========= */

export async function fetchDashboard(
  token?: string
): Promise<DashboardResponse> {
  const authToken = token ?? getAuthToken();
  if (!authToken) {
    throw new Error("unauthorized");
  }

  const res = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
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

export async function updateMonthlyBudget(
  token: string,
  monthlyBudgetAmount: number | null
): Promise<{ monthlyBudgetAmount: number | null }> {
  const res = await fetch(`${BASE_URL}/api/user/budget`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ monthlyBudgetAmount }),
  });

  if (!res.ok) {
    throw new Error("update_budget_failed");
  }

  return res.json();
}

/* ========= 單筆支出：編輯 / 刪除 ========= */

export async function updateExpense(
  token: string,
  expenseId: number,
  payload: { amount?: number; note?: string | null }
): Promise<RecentExpense> {
  const res = await fetch(`${BASE_URL}/api/expenses/${expenseId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("update_expense_failed");
  }

  return res.json();
}

export async function deleteExpense(
  token: string,
  expenseId: number
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/expenses/${expenseId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("delete_expense_failed");
  }
}
