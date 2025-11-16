// src/services/stats.ts

import prisma from "../db";
import type { User } from "@prisma/client";

export interface MonthlyCategoryStat {
  categoryId: number | null;
  categoryName: string;
  total: number;
}

export interface MonthlyStats {
  /** 本月總支出金額 */
  total: number;
  /** 本月支出筆數 */
  count: number;
  /** 各分類加總 */
  byCategory: MonthlyCategoryStat[];
}

/**
 * 取得「當月」的支出統計（總額、筆數、分類加總）
 */
export async function getCurrentMonthStats(user: User): Promise<MonthlyStats> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  // 撈出本月所有支出（未刪除）
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
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // 依分類加總
  const map = new Map<number | null, MonthlyCategoryStat>();

  for (const e of expenses) {
    const key = e.categoryId ?? null;
    const prev = map.get(key);

    const amount = Number(e.amount || 0);
    const name = e.category?.name ?? "未分類";

    if (!prev) {
      map.set(key, { categoryId: key, categoryName: name, total: amount });
    } else {
      prev.total += amount;
    }
  }

  const byCategory: MonthlyCategoryStat[] = Array.from(map.values()).sort(
    (a, b) => b.total - a.total
  );

  return {
    total,
    count: expenses.length,
    byCategory,
  };
}

/**
 * 把本月統計 + 預算資訊，轉成適合 LINE 顯示的多行文字
 */
export function formatMonthlyStatsText(
  user: User,
  stats: MonthlyStats
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const currency = user.currency || "TWD";

  const fmt = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const totalText = fmt.format(stats.total);

  // 預算 / 剩餘 / 是否超支
  let budgetLine = "本月預算：尚未設定";
  let remainingLine = "";
  let statusLine = "";

  const budget =
    user.monthlyBudgetAmount != null ? Number(user.monthlyBudgetAmount) : null;

  if (budget != null && !Number.isNaN(budget)) {
    const remaining = budget - stats.total;
    const remainingText = fmt.format(Math.abs(remaining));

    budgetLine = `本月預算：${fmt.format(budget)}`;

    if (remaining >= 0) {
      remainingLine = `剩餘可花：${remainingText}`;
      statusLine = "狀態：✅ 尚未超支";
    } else {
      remainingLine = `已超出預算：${remainingText}`;
      statusLine = "狀態：⚠️ 已超支，記得稍微收斂一下～";
    }
  }

  // 如果本月尚未記帳
  if (stats.count === 0) {
    return [
      `📊 本月統計（${year}/${month.toString().padStart(2, "0")}）`,
      "——————————",
      "這個月你還沒有任何記帳紀錄。",
      "",
      "你可以直接輸入：",
      "午餐 120",
      "或打「記帳」讓我一步步帶你記～",
    ].join("\n");
  }

  // 分類前 3 名
  const top = stats.byCategory.slice(0, 3);
  const lines: string[] = [];

  lines.push(`📊 本月統計（${year}/${month.toString().padStart(2, "0")}）`);
  lines.push("——————————");
  lines.push(`總支出：${totalText}`);
  lines.push(budgetLine);
  if (remainingLine) lines.push(remainingLine);
  if (statusLine) lines.push(statusLine);

  if (top.length > 0) {
    lines.push("");
    lines.push("分類前幾名：");

    const base = stats.total || 1;
    top.forEach((item, index) => {
      const percent = Math.round((item.total / base) * 1000) / 10; // 小數一位
      lines.push(
        `${index + 1}. ${item.categoryName}：${fmt.format(
          item.total
        )}（${percent}%）`
      );
    });
  }

  lines.push("");
  lines.push(`本月累計 ${stats.count} 筆支出。`);
  lines.push("你可以輸入「記帳」或直接打「午餐 120」繼續記帳～");

  return lines.join("\n");
}
