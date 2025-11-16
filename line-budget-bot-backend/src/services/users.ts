// src/services/users.ts

import prisma from "../db";

export async function ensureUserExists(lineUserId: string) {
  const existing = await prisma.user.findUnique({ where: { lineUserId } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      lineUserId,
      currency: "TWD",
      isReminderEnabled: true,
      dailyReminderTime: "21:30",
    },
  });
}
