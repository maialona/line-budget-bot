// Shared types for LINE event handling.

import { WebhookEvent, MessageEvent, TextEventMessage } from "@line/bot-sdk";

export type LineEvent = WebhookEvent;

// Convenience type: a LINE text message event
export type LineTextMessageEvent = MessageEvent & {
  message: TextEventMessage;
};
