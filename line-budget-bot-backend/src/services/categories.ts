// src/services/categories.ts

import prisma from "../db";

export async function getOrCreateCategory(userId: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return getOrCreateFallbackCategory(userId);
  }

  return prisma.category.upsert({
    where: {
      userId_name: {
        userId,
        name: trimmed,
      },
    },
    update: {},
    create: {
      userId,
      name: trimmed,
      isDefault: false,
      isActive: true,
    },
  });
}

// 給快速記帳「抓不到類別」時使用的通用分類
export async function getOrCreateFallbackCategory(userId: number) {
  const name = "其他";
  return prisma.category.upsert({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
    update: {},
    create: {
      userId,
      name,
      isDefault: true,
      isActive: true,
    },
  });
}
