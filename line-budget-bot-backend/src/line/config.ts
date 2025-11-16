import "dotenv/config";
import { ClientConfig, MiddlewareConfig } from "@line/bot-sdk";

if (
  !process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  !process.env.LINE_CHANNEL_SECRET
) {
  // In real apps you might not want to throw at import time,
  // but for now this helps surface misconfig early.
  console.warn(
    "[WARN] LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET not set"
  );
}

export const lineConfig: ClientConfig & MiddlewareConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
};
