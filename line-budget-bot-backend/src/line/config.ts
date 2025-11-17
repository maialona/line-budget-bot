// src/line/config.ts

import dotenv from "dotenv";
dotenv.config();

// 這裡不要再從 @line/bot-sdk 匯入型別，避免「無 exported member」問題。
// 我們自己定義簡單版的設定型別就可以了。
type LineClientConfig = {
  channelAccessToken: string;
  channelSecret?: string;
};

type LineMiddlewareConfig = {
  channelSecret: string;
};

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

if (!channelAccessToken) {
  console.warn("[WARN] LINE_CHANNEL_ACCESS_TOKEN 尚未設定");
}
if (!channelSecret) {
  console.warn("[WARN] LINE_CHANNEL_SECRET 尚未設定（Webhook 驗證會失敗）");
}

// 提供給 Client 使用的設定
export const lineConfig: LineClientConfig = {
  channelAccessToken,
  channelSecret,
};

// 提供給 middleware 使用的設定
export const lineMiddlewareConfig: LineMiddlewareConfig = {
  channelSecret,
};
