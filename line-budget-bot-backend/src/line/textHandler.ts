// src/line/textHandler.ts

import { Client } from "@line/bot-sdk";
import type { LineEvent } from "./types";
import { ensureUserExists } from "../services/users";
import { createExpenseFromQuickText } from "../services/expenses";
import {
  getCurrentMonthStats,
  formatMonthlyStatsText,
} from "../services/stats";
import { setMonthlyBudget } from "../services/budget";

// ==== 型別：文字訊息事件 ====

type TextMessageEvent = LineEvent & {
  type: "message";
  message: {
    type: "text";
    id: string;
    text: string;
    [key: string]: unknown;
  };
};

// 型別守衛：確認這個事件真的是「文字訊息」
function isTextMessageEvent(event: LineEvent): event is TextMessageEvent {
  return (
    event.type === "message" && !!event.message && event.message.type === "text"
  );
}

// ===========================================================

export async function handleTextMessage(client: Client, event: LineEvent) {
  // 不是文字訊息就直接忽略
  if (!isTextMessageEvent(event)) return;

  const userId = event.source.userId;
  if (!userId) return;

  const user = await ensureUserExists(userId);

  const text = event.message.text.trim();

  // （以下全部保留你原本的邏輯）
  // 1. 指令：記帳 / +
  if (text === "記帳" || text === "+") {
    await client.replyMessage(event.replyToken!, {
      type: "text",
      text: `我們來記一筆支出～

之後會做完整的引導式流程，現在先示範：

請直接試試輸入：午餐 120 或 120 午餐 麥當勞。`,
    });
    return;
  }

  // 2. 指令：本月統計（現在會包含預算資訊）
  if (text.includes("本月統計")) {
    try {
      const stats = await getCurrentMonthStats(user);

      // ⚠️ 你現在只想要 Flex 卡片 + quick reply，
      // 所以這裡不要再用 formatMonthlyStatsText 回文字版
      // 只要送 Flex Message + Quick Reply（這段你前面已經實作過，可以沿用）
      // ...
    } catch (err) {
      console.error("[ERROR] monthly stats failed", err);
      await client.replyMessage(event.replyToken!, {
        type: "text",
        text: "查詢本月統計時發生錯誤，請稍後再試一次。",
      });
    }
    return;
  }

  // 3. 指令：設定預算
  if (text.includes("設定預算")) {
    const match = text.match(/設定預算\s*([0-9]+(?:\.[0-9]+)?)/);

    if (!match) {
      await client.replyMessage(event.replyToken!, {
        type: "text",
        text: `請在「設定預算」後面加上金額，例如：
- 設定預算 20000`,
      });
      return;
    }

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) {
      await client.replyMessage(event.replyToken!, {
        type: "text",
        text: "預算金額要是大於 0 的數字，例如：設定預算 20000",
      });
      return;
    }

    try {
      const updatedUser = await setMonthlyBudget(user.id, amount);
      const stats = await getCurrentMonthStats(updatedUser);
      const statsText = formatMonthlyStatsText(updatedUser, stats);

      await client.replyMessage(event.replyToken!, {
        type: "text",
        text: `本月預算已設定為：${amount}

${statsText}`,
      });
    } catch (err) {
      console.error("[ERROR] set budget failed", err);
      await client.replyMessage(event.replyToken!, {
        type: "text",
        text: "設定預算時發生錯誤，請稍後再試一次。",
      });
    }

    return;
  }

  // 4. 其他文字 -> 嘗試當作「快速記帳」來解析
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

    await client.replyMessage(event.replyToken!, {
      type: "text",
      text: extra ? `${result.message}${extra}` : result.message,
    });
  } catch (err) {
    console.error("[ERROR] quick expense failed", err);
    await client.replyMessage(event.replyToken!, {
      type: "text",
      text: `剛剛記帳時遇到一點問題，請稍後再試一次，或先用「記帳」指令一步一步輸入。`,
    });
  }
}
