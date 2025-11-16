// src/services/budget.ts

import prisma from "../db";
import type { User } from "@prisma/client";

// 設定（或更新）本月預算金額（以「當前幣別」為單位）
export async function setMonthlyBudget(
  userId: number,
  amount: number
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      monthlyBudgetAmount: amount,
    },
  });
}
