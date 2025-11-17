// src/line/textHandler.ts

import { Client } from "@line/bot-sdk";
import type { LineEvent } from "./types";
import { ensureUserExists } from "../services/users";
import { createExpenseFromQuickText } from "../services/expenses";
import {
  getCurrentMonthStats,
  formatMonthlyStatsText, // 仍保留給其他地方用（例如設定預算成功時）
} from "../services/stats";
import { setMonthlyBudget } from "../services/budget";

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "https://line-budget-bot.vercel.app";

// 把 LINE WebhookEvent 收窄成「文字訊息事件」
type TextMessageEvent = LineEvent & {
  type: "message";
  message: {
    type: "text";
    id: string;
    text: string;
    [key: string]: unknown;
  };
};

function isTextMessageEvent(event: LineEvent): event is TextMessageEvent {
  return event.type === "message" && event.message.type === "text";
}

/**
 * 「本月統計」Flex 卡片（本月摘要 + 預算狀態 + Top 分類 2×2）
 */
function buildMonthlyStatsFlex(stats: any, user: any): any {
  const total = Number(stats.total ?? 0);
  const count = Number(stats.count ?? 0);

  const budget =
    user.monthlyBudgetAmount != null ? Number(user.monthlyBudgetAmount) : null;
  const remaining = budget != null ? budget - total : null;

  const byCategoryRaw: any[] = Array.isArray(stats.byCategory)
    ? stats.byCategory
    : [];

  const byCategory = [...byCategoryRaw]
    .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))
    .slice(0, 4);

  const totalForPercent = total || 1;
  const MEDALS = ["🥇", "🥈", "🥉", "🏅"];

  const topCategoryCards = byCategory.map((item, index) => {
    const medal = MEDALS[index] ?? "•";
    const name = String(item.categoryName ?? "其他");
    const amount = Number(item.total ?? 0);
    const percent = Math.round((amount / totalForPercent) * 1000) / 10;

    return {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      backgroundColor: "#020617",
      cornerRadius: "16px",
      spacing: "xs",
      contents: [
        {
          type: "text",
          text: `${medal} ${name}`,
          size: "sm",
          weight: "bold",
          color: "#F9FAFB",
          wrap: true,
        },
        {
          type: "text",
          text: `${amount.toLocaleString()} TWD`,
          size: "sm",
          margin: "sm",
          color: "#E5E7EB",
        },
        {
          type: "text",
          text: `${percent}%`,
          size: "xs",
          color: "#9CA3AF",
        },
      ],
    } as any;
  });

  const categoryRows: any[] = [];
  for (let i = 0; i < topCategoryCards.length; i += 2) {
    const left = topCategoryCards[i];
    const right = topCategoryCards[i + 1];

    categoryRows.push({
      type: "box",
      layout: "horizontal",
      spacing: "md",
      contents: [
        left,
        right || {
          type: "box",
          layout: "vertical",
          contents: [],
        },
      ],
    });
  }

  const totalStr = total.toLocaleString();
  const budgetStr =
    budget != null ? budget.toLocaleString() + " TWD" : "尚未設定";
  const spentStr = total.toLocaleString() + " TWD";
  const remainingStr =
    remaining == null
      ? "-"
      : remaining >= 0
      ? `${remaining.toLocaleString()} TWD`
      : `超支 ${Math.abs(remaining).toLocaleString()} TWD`;

  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      backgroundColor: "#020617",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "本月統計",
          weight: "bold",
          size: "lg",
          color: "#F9FAFB",
        },
        {
          type: "text",
          text: "本月記帳摘要",
          size: "xs",
          color: "#9CA3AF",
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          spacing: "md",
          contents: [
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: totalStr,
                  size: "3xl",
                  weight: "bold",
                  color: "#FACC15",
                },
                {
                  type: "text",
                  text: "本月總支出 (TWD)",
                  size: "xs",
                  color: "#E5E7EB",
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "xs",
              contents: [
                {
                  type: "text",
                  text: `${count} 筆`,
                  size: "lg",
                  weight: "bold",
                  color: "#60A5FA",
                  align: "end",
                },
                {
                  type: "text",
                  text: "記帳筆數",
                  size: "xs",
                  color: "#E5E7EB",
                  align: "end",
                },
              ],
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          paddingAll: "16px",
          cornerRadius: "18px",
          backgroundColor: "#020617",
          borderColor: "#111827",
          borderWidth: "1px",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: "預算狀態",
              size: "sm",
              weight: "bold",
              color: "#BFDBFE",
            },
            {
              type: "text",
              text: `本月預算：${budgetStr}`,
              size: "sm",
              color: "#E5E7EB",
            },
            {
              type: "text",
              text: `已花金額：${spentStr}`,
              size: "sm",
              color: "#E5E7EB",
            },
            {
              type: "text",
              text: `剩餘可花：${remainingStr}`,
              size: "sm",
              color:
                remaining == null
                  ? "#E5E7EB"
                  : remaining >= 0
                  ? "#BBF7D0"
                  : "#FED7AA",
            },
          ],
        },
        {
          type: "text",
          text: "支出 Top 分類",
          size: "sm",
          weight: "bold",
          margin: "md",
          color: "#E5E7EB",
        },
        ...categoryRows,
        {
          type: "text",
          text: "想看圖表版 Dashboard 可以點下面按鈕開啟網頁。",
          size: "xxs",
          margin: "md",
          color: "#6B7280",
          wrap: true,
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      backgroundColor: "#020617",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: "#111827",
          action: {
            type: "uri",
            label: "開啟 Dashboard",
            uri: FRONTEND_ORIGIN,
          },
        },
      ],
    },
  };
}

// ======================= 主流程 =======================

export async function handleTextMessage(client: Client, event: LineEvent) {
  if (!isTextMessageEvent(event)) return;

  const userId = event.source.userId;
  if (!userId) return;

  const user = await ensureUserExists(userId);
  const text = event.message.text.trim();

  // 1. 記帳 / +
  if (text === "記帳" || text === "+") {
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `我們來記一筆支出～

之後會做完整的引導式流程，現在先示範：

請直接試試輸入：午餐 120 或 120 午餐 麥當勞。`,
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "示範：午餐 120",
              text: "午餐 120",
            },
          },
          {
            type: "action",
            action: {
              type: "message",
              label: "本月統計",
              text: "本月統計",
            },
          },
          {
            type: "action",
            action: {
              type: "uri",
              label: "開 Dashboard",
              uri: FRONTEND_ORIGIN,
            },
          },
        ],
      },
    });
    return;
  }

  // 2. 本月統計：只回 Flex + Quick Reply（不再回文字統計）
  if (text.includes("本月統計")) {
    try {
      const stats = await getCurrentMonthStats(user);
      const flexContent = buildMonthlyStatsFlex(stats, user);

      await client.replyMessage(event.replyToken, {
        type: "flex",
        altText: "本月統計",
        contents: flexContent,
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "message",
                label: "再記一筆",
                text: "記帳",
              },
            },
            {
              type: "action",
              action: {
                type: "message",
                label: "設定本月預算",
                text: "設定預算",
              },
            },
            {
              type: "action",
              action: {
                type: "uri",
                label: "開 Dashboard",
                uri: FRONTEND_ORIGIN,
              },
            },
          ],
        },
      } as any);
    } catch (err) {
      console.error("[ERROR] monthly stats failed", err);
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "查詢本月統計時發生錯誤，請稍後再試一次。",
      });
    }
    return;
  }

  // 3. 設定預算（保留原本：Flex + 文字說明）
  if (text.includes("設定預算")) {
    const match = text.match(/設定預算\s*([0-9]+(?:\.[0-9]+)?)/);

    if (!match) {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `請在「設定預算」後面加上金額，例如：
- 設定預算 20000`,
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "message",
                label: "示範：設定預算 20000",
                text: "設定預算 20000",
              },
            },
            {
              type: "action",
              action: {
                type: "message",
                label: "本月統計",
                text: "本月統計",
              },
            },
            {
              type: "action",
              action: {
                type: "uri",
                label: "開 Dashboard",
                uri: FRONTEND_ORIGIN,
              },
            },
          ],
        },
      });
      return;
    }

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "預算金額要是大於 0 的數字，例如：設定預算 20000",
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "message",
                label: "示範：設定預算 20000",
                text: "設定預算 20000",
              },
            },
            {
              type: "action",
              action: {
                type: "message",
                label: "本月統計",
                text: "本月統計",
              },
            },
          ],
        },
      });
      return;
    }

    try {
      const updatedUser = await setMonthlyBudget(user.id, amount);
      const stats = await getCurrentMonthStats(updatedUser);
      const statsText = formatMonthlyStatsText(updatedUser, stats);
      const flexContent = buildMonthlyStatsFlex(stats, updatedUser);

      await client.replyMessage(event.replyToken, [
        {
          type: "flex",
          altText: "預算已更新，本月統計",
          contents: flexContent,
        } as any,
        {
          type: "text",
          text: `本月預算已設定為：${amount}

${statsText}`,
          quickReply: {
            items: [
              {
                type: "action",
                action: {
                  type: "message",
                  label: "再記一筆",
                  text: "記帳",
                },
              },
              {
                type: "action",
                action: {
                  type: "message",
                  label: "看本月統計",
                  text: "本月統計",
                },
              },
              {
                type: "action",
                action: {
                  type: "uri",
                  label: "開 Dashboard",
                  uri: FRONTEND_ORIGIN,
                },
              },
            ],
          },
        },
      ]);
    } catch (err) {
      console.error("[ERROR] set budget failed", err);
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "設定預算時發生錯誤，請稍後再試一次。",
      });
    }

    return;
  }

  // 4. 其他文字 → 快速記帳
  try {
    const result = await createExpenseFromQuickText(user, text);

    let extra = "";

    if (user.monthlyBudgetAmount) {
      const stats = await getCurrentMonthStats(user);
      const budget = Number(user.monthlyBudgetAmount);
      const spent = stats.total;
      const remaining = budget - spent;

      if (remaining >= 0) {
        extra = `

本月預算：${budget}
本月已花：${spent}
剩餘可花：${remaining}`;
      } else {
        extra = `

本月預算：${budget}
本月已花：${spent}
⚠ 已超出預算：${Math.abs(remaining)}`;
      }
    }

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: extra ? `${result.message}${extra}` : result.message,
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "再記一筆",
              text: "記帳",
            },
          },
          {
            type: "action",
            action: {
              type: "message",
              label: "本月統計",
              text: "本月統計",
            },
          },
          {
            type: "action",
            action: {
              type: "uri",
              label: "開 Dashboard",
              uri: FRONTEND_ORIGIN,
            },
          },
        ],
      },
    });
  } catch (err) {
    console.error("[ERROR] quick expense failed", err);
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `剛剛記帳時遇到一點問題，請稍後再試一次，或先用「記帳」指令一步一步輸入。`,
    });
  }
}
