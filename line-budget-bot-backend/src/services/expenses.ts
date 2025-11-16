// src/services/expenses.ts

import prisma from "../db";
import { getOrCreateCategory, getOrCreateFallbackCategory } from "./categories";
import type { User } from "@prisma/client";

export interface QuickExpenseResult {
  success: boolean;
  message: string;
}

// 嘗試將一行文字快速解析為一筆支出並寫入資料庫
export async function createExpenseFromQuickText(
  user: User,
  rawText: string
): Promise<QuickExpenseResult> {
  const text = rawText.trim();

  // 1. 找金額（第一個出現的數字）
  const amountMatch = text.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!amountMatch) {
    return {
      success: false,
      message:
        "我看不太出金額，是不是忘了輸入數字？\n\n可以試試：午餐 120、120 午餐 麥當勞。",
    };
  }

  const amountStr = amountMatch[1];
  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      message: "金額看起來怪怪的，請輸入大於 0 的數字，例如：120。",
    };
  }

  // 2. 把這個金額從文字裡拿掉，剩下的拿來判斷類別與備註
  const withoutAmount = text
    .replace(amountMatch[0], " ")
    .replace(/\s+/g, " ")
    .trim();

  let categoryName = "";
  let note = "";

  if (withoutAmount) {
    // 簡單切詞：以空白（含全形）分段
    const parts = withoutAmount
      .replace(/\u3000/g, " ")
      .split(" ")
      .filter(Boolean);

    if (parts.length > 0) {
      categoryName = parts[0]; // 例如「午餐」
      note = parts.slice(1).join(" "); // 例如「麥當勞」
    }
  }

  // 3. 取得或建立分類
  const category = categoryName
    ? await getOrCreateCategory(user.id, categoryName)
    : await getOrCreateFallbackCategory(user.id);

  // 4. 寫入資料庫
  await prisma.expense.create({
    data: {
      userId: user.id,
      categoryId: category.id,
      amount,
      currency: user.currency,
      spentAt: new Date(),
      note: note || null,
      source: "quick_text",
      rawText: text,
    },
  });

  const displayCategory = categoryName || "其他";
  const displayNote = note || "無備註";

  return {
    success: true,
    message: `已幫你記上一筆支出：
- 類別：${displayCategory}
- 金額：${amount}
- 備註：${displayNote}`,
  };
}
