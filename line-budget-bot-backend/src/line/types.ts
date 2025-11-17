// src/line/types.ts

// 不再從 @line/bot-sdk 匯入型別，全部用我們自己的簡單型別描述。

// 最少版本的 Line 事件型別，讓 textHandler 用來做型別標註即可。
export type LineEvent = {
  type: string;
  replyToken?: string;
  source: {
    type: string;
    userId?: string;
    [key: string]: unknown;
  };
  message?: {
    id: string;
    type: string;
    text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
