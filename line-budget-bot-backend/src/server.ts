// src/server.ts
// Express app setup（LINE Webhook + LINE Login + Dashboard API）

import express, { type Request } from "express";
import { middleware, Client } from "@line/bot-sdk";
import jwt from "jsonwebtoken";
import { lineConfig } from "./line/config";
import type { LineEvent } from "./line/types";
import prisma from "./db";
import { ensureUserExists } from "./services/users";
import { handleTextMessage } from "./line/textHandler";
import { getDashboardDataForCurrentMonth } from "./services/dashboard";

// === 環境變數 ===
const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID ?? "";
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET ?? "";
const LINE_LOGIN_CALLBACK_URL =
  process.env.LINE_LOGIN_CALLBACK_URL ??
  "http://localhost:3000/auth/line/callback";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

// 從 Authorization Bearer token 中取出 User
async function getUserFromRequest(req: Request) {
  const auth = req.headers["authorization"] as string | undefined;
  if (!auth || !auth.startsWith("Bearer ")) {
    throw new Error("unauthorized");
  }

  const token = auth.slice("Bearer ".length);

  const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
    lineUserId: string;
    sub?: string;
  };

  const userId = payload.sub ? Number(payload.sub) : undefined;
  if (!userId || Number.isNaN(userId)) {
    throw new Error("invalid_token");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("user_not_found");
  }

  return user;
}

// 發給前端用的 JWT（內含 userId / lineUserId）
function signUserToken(userId: number, lineUserId: string) {
  return jwt.sign({ lineUserId }, JWT_SECRET, {
    subject: String(userId),
    expiresIn: "7d",
  });
}

export function createServer() {
  const app = express();

  // ⚠️ 不要在 LINE middleware 之前使用 express.json()
  // LINE 需要原始 body 來做簽章驗證，若先被解析會造成 signature 驗證失敗。

  const lineClient = new Client(lineConfig);

  // ============= Health check ============
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ============= LINE Webhook ============
  app.post("/line/webhook", middleware(lineConfig), async (req, res) => {
    const events: LineEvent[] = (req.body as any)?.events ?? [];

    try {
      await Promise.all(
        events.map(async (event) => {
          if (event.type === "follow") {
            // 使用者把 Bot 加為好友
            if (event.source.userId) {
              await ensureUserExists(event.source.userId);
              await lineClient.replyMessage(event.replyToken, {
                type: "text",
                text:
                  "嗨，我是你的記帳小幫手！\n\n" +
                  "你可以先試著輸入：\n" +
                  "- 記帳\n- 本月統計\n- 設定預算",
              });
            }
          } else if (
            event.type === "message" &&
            event.message.type === "text"
          ) {
            await handleTextMessage(lineClient, event);
          }
        })
      );

      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("[ERROR] handling webhook events", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // ============= LINE Login：導向到 LINE 授權畫面 ============
  app.get("/auth/line/login", (_req, res) => {
    if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET) {
      return res.status(500).send("LINE_LOGIN_CHANNEL_ID/SECRET 尚未設定");
    }

    const state = Math.random().toString(36).slice(2); // demo 用，正式可存在 cookie
    const redirectUri = encodeURIComponent(LINE_LOGIN_CALLBACK_URL);
    const scope = encodeURIComponent("openid profile");

    const url =
      "https://access.line.me/oauth2/v2.1/authorize" +
      `?response_type=code` +
      `&client_id=${LINE_LOGIN_CHANNEL_ID}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}` +
      `&scope=${scope}`;

    res.redirect(url);
  });

  // ============= LINE Login：callback，換 token + 建立 JWT ============
  app.get("/auth/line/callback", async (req, res) => {
    const code = req.query.code as string | undefined;
    const error = req.query.error as string | undefined;

    if (error || !code) {
      const url = new URL("/", FRONTEND_ORIGIN);
      url.searchParams.set("login_error", error || "missing_code");
      return res.redirect(url.toString());
    }

    try {
      // 1) 用 code 換 access token / id_token
      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: LINE_LOGIN_CALLBACK_URL,
          client_id: LINE_LOGIN_CHANNEL_ID,
          client_secret: LINE_LOGIN_CHANNEL_SECRET,
        }),
      });

      if (!tokenRes.ok) {
        console.error("[LINE] token endpoint failed", await tokenRes.text());
        throw new Error("token_request_failed");
      }

      const tokenJson: any = await tokenRes.json();
      const idToken = tokenJson.id_token as string | undefined;
      if (!idToken) {
        throw new Error("no_id_token");
      }

      // 2) 驗證 id_token，拿到使用者 profile（sub / name）
      const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          id_token: idToken,
          client_id: LINE_LOGIN_CHANNEL_ID,
        }),
      });

      if (!verifyRes.ok) {
        console.error("[LINE] verify id_token failed", await verifyRes.text());
        throw new Error("verify_id_token_failed");
      }

      const profile: any = await verifyRes.json();
      const lineUserId = profile.sub as string | undefined;
      const displayName = profile.name as string | undefined;

      if (!lineUserId) {
        throw new Error("no_sub_in_profile");
      }

      // 3) 建立 / 取得本地 User
      const user = await ensureUserExists(lineUserId);

      if (displayName && !user.displayName) {
        await prisma.user.update({
          where: { id: user.id },
          data: { displayName },
        });
      }

      // 4) 發 JWT 給前端
      const jwtToken = signUserToken(user.id, lineUserId);

      const redirectUrl = new URL("/", FRONTEND_ORIGIN);
      redirectUrl.searchParams.set("token", jwtToken);
      res.redirect(redirectUrl.toString());
    } catch (err) {
      console.error("[ERROR] LINE login callback failed", err);
      const redirectUrl = new URL("/", FRONTEND_ORIGIN);
      redirectUrl.searchParams.set("login_error", "line_login_failed");
      res.redirect(redirectUrl.toString());
    }
  });

  // ============= Dashboard API：需要帶 Bearer JWT ============
  app.get("/api/dashboard", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      const data = await getDashboardDataForCurrentMonth(user);
      res.json(data);
    } catch (err) {
      console.error("[ERROR] /api/dashboard failed", err);
      return res.status(401).json({ error: "invalid_token" });
    }
  });

  // ============= 更新每月預算 ============
  app.put("/api/user/budget", express.json(), async (req, res) => {
    try {
      const user = await getUserFromRequest(req);

      const { monthlyBudgetAmount } = req.body as {
        monthlyBudgetAmount: number | null;
      };

      // 簡單驗證：可以是 null，或 >= 0 的數字
      if (
        monthlyBudgetAmount !== null &&
        (typeof monthlyBudgetAmount !== "number" || monthlyBudgetAmount < 0)
      ) {
        return res.status(400).json({ error: "invalid_budget_amount" });
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          monthlyBudgetAmount:
            monthlyBudgetAmount === null ? null : monthlyBudgetAmount,
        },
      });

      res.json({
        monthlyBudgetAmount: updated.monthlyBudgetAmount
          ? Number(updated.monthlyBudgetAmount)
          : null,
      });
    } catch (err) {
      console.error("[ERROR] /api/user/budget failed", err);
      if ((err as Error).message === "unauthorized") {
        return res.status(401).json({ error: "unauthorized" });
      }
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // ============= 更新單筆支出（金額 & 備註） ============
  app.put("/api/expenses/:id", express.json(), async (req, res) => {
    try {
      const user = await getUserFromRequest(req as any);

      const expenseId = Number(req.params.id);
      if (!Number.isFinite(expenseId)) {
        return res.status(400).json({ error: "invalid_id" });
      }

      const { amount, note } = req.body as {
        amount?: number;
        note?: string | null;
      };

      const data: any = {};
      if (amount != null) {
        if (!Number.isFinite(amount) || amount < 0) {
          return res.status(400).json({ error: "invalid_amount" });
        }
        data.amount = amount;
      }
      if (note !== undefined) {
        data.note = note;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "no_update_fields" });
      }

      // 先確認這筆支出屬於目前登入的 user
      const existing = await prisma.expense.findFirst({
        where: {
          id: expenseId,
          userId: user.id,
          deletedAt: null,
        },
      });

      if (!existing) {
        return res.status(404).json({ error: "expense_not_found" });
      }

      const updated = await prisma.expense.update({
        where: { id: existing.id },
        data,
      });

      // 回傳簡化後的資料給前端
      return res.json({
        id: updated.id,
        spentAt: updated.spentAt.toISOString(),
        categoryName: null, // Dashboard 會重新從 /api/dashboard 撈最新分類
        amount: Number(updated.amount),
        note: updated.note ?? null,
      });
    } catch (err) {
      console.error("[ERROR] PUT /api/expenses/:id failed", err);
      if ((err as Error).message === "unauthorized") {
        return res.status(401).json({ error: "unauthorized" });
      }
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // ============= 刪除單筆支出（soft delete） ============
  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req as any);

      const expenseId = Number(req.params.id);
      if (!Number.isFinite(expenseId)) {
        return res.status(400).json({ error: "invalid_id" });
      }

      const existing = await prisma.expense.findFirst({
        where: {
          id: expenseId,
          userId: user.id,
          deletedAt: null,
        },
      });

      if (!existing) {
        return res.status(404).json({ error: "expense_not_found" });
      }

      await prisma.expense.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });

      return res.status(204).send();
    } catch (err) {
      console.error("[ERROR] DELETE /api/expenses/:id failed", err);
      if ((err as Error).message === "unauthorized") {
        return res.status(401).json({ error: "unauthorized" });
      }
      return res.status(500).json({ error: "internal_error" });
    }
  });

  return app;
}
