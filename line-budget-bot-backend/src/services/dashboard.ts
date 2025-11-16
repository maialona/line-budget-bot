// src/services/dashboard.ts

import prisma from "../db";
import type { User } from "@prisma/client";
import { getCurrentMonthStats } from "./stats";

export interface DashboardSummary {
  totalExpense: number;
  budget: number | null;
  remaining: number | null;
  isOverBudget: boolean;
  expenseCount: number;
}

export interface DashboardCategoryItem {
  categoryName: string;
  total: number;
  percent: number; // 0~100
}

export interface DashboardDailyPoint {
  date: string; // "YYYY-MM-DD"
  total: number;
}

export interface DashboardRecentExpense {
  id: number;
  spentAt: string; // ISO 字串
  categoryName: string;
  amount: number;
  note: string | null;
}

export interface DashboardData {
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
  summary: DashboardSummary;
  byCategory: DashboardCategoryItem[];
  dailySeries: DashboardDailyPoint[];
  recentExpenses: DashboardRecentExpense[];
}

// 取得「當月」的 Dashboard 資料
export async function getDashboardDataForCurrentMonth(
  user: User
): Promise<DashboardData> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  // 1. 本月統計（總額 + 分類統計）
  const stats = await getCurrentMonthStats(user);
  const totalExpense = stats.total;

  // 2. 撈本月所有支出，做「每日趨勢」＋「最近支出」
  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      spentAt: {
        gte: start,
        lt: end,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      spentAt: "desc",
    },
  });

  // 2.1 每日總額
  const dailyMap = new Map<string, number>();

  for (const e of expenses) {
    const amt = Number(e.amount);
    if (!Number.isFinite(amt)) continue;

    const dateKey = e.spentAt.toISOString().slice(0, 10); // YYYY-MM-DD
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + amt);
  }

  const dailySeries: DashboardDailyPoint[] = Array.from(dailyMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, total]) => ({ date, total }));

  // 2.2 最近 N 筆支出
  const RECENT_LIMIT = 20;
  const recentExpenses: DashboardRecentExpense[] = expenses
    .slice(0, RECENT_LIMIT)
    .map((e) => ({
      id: e.id,
      spentAt: e.spentAt.toISOString(),
      categoryName: e.category?.name ?? "其他",
      amount: Number(e.amount),
      note: e.note ?? null,
    }));

  // 3. Summary（含預算資訊）
  const budget =
    user.monthlyBudgetAmount != null ? Number(user.monthlyBudgetAmount) : null;

  let remaining: number | null = null;
  let isOverBudget = false;

  if (budget != null) {
    remaining = budget - totalExpense;
    if (remaining < 0) {
      isOverBudget = true;
    }
  }

  const summary: DashboardSummary = {
    totalExpense,
    budget,
    remaining,
    isOverBudget,
    expenseCount: expenses.length,
  };

  // 4. 分類比例（stats.byCategory 已經算好金額）
  const byCategoryTotal = stats.total || 1; // 避免除以 0
  const byCategory: DashboardCategoryItem[] = stats.byCategory.map((item) => ({
    categoryName: item.categoryName,
    total: item.total,
    percent: Math.round((item.total / byCategoryTotal) * 1000) / 10, // 四捨五入到小數點一位
  }));

  return {
    user: {
      id: user.id,
      lineUserId: user.lineUserId,
      displayName: user.displayName ?? null,
      currency: user.currency,
      monthlyBudgetAmount: user.monthlyBudgetAmount
        ? Number(user.monthlyBudgetAmount)
        : null,
    },
    period: {
      type: "month",
      start: start.toISOString(),
      end: end.toISOString(),
    },
    summary,
    byCategory,
    dailySeries,
    recentExpenses,
  };
}
