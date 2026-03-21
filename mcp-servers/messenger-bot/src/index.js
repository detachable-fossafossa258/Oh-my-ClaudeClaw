#!/usr/bin/env node

/**
 * OpenClaw-CC Messenger Bot MCP Server
 *
 * Discord/Telegram 연동을 통한 양방향 커뮤니케이션.
 * 순수 MCP 라우터 — 비즈니스 로직은 tools.js에 위임.
 *
 * Tools:
 *   messenger_send   - 메시지 전송
 *   messenger_read   - 최근 메시지 읽기
 *   messenger_poll   - 새 메시지 폴링 (미읽은 메시지)
 *   messenger_status - 연결 상태 확인
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DiscordClient } from "./discord.js";
import { TelegramClient } from "./telegram.js";
import { MessageQueue } from "./queue.js";
import {
  handleMessengerSend,
  handleMessengerRead,
  handleMessengerPoll,
  handleMessengerStatus,
} from "./tools.js";

// ─── Configuration ──────────────────────────────────────────

const CONFIG = {
  discord: {
    enabled: !!process.env.DISCORD_BOT_TOKEN,
    token: process.env.DISCORD_BOT_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },
  telegram: {
    enabled: !!process.env.TELEGRAM_BOT_TOKEN,
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
};

// ─── Initialize Clients & State ─────────────────────────────

const discord = CONFIG.discord.enabled
  ? new DiscordClient(CONFIG.discord.token, CONFIG.discord.channelId, CONFIG.discord.webhookUrl)
  : null;

const telegram = CONFIG.telegram.enabled
  ? new TelegramClient(CONFIG.telegram.token, CONFIG.telegram.chatId)
  : null;

const queue = new MessageQueue();

const state = {
  queue,
  lastPollTime: new Date().toISOString(),
  setLastPollTime(t) { this.lastPollTime = t; },
};

const clients = { discord, telegram };

// ─── MCP Server ─────────────────────────────────────────────

const server = new Server(
  { name: "openclaw-cc-messenger", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ListTools — 도구 목록
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "messenger_send",
      description: "Send a message to Discord or Telegram. Use for notifications, reports, or replies.",
      inputSchema: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            enum: ["discord", "telegram", "all"],
            description: "Target platform (all = send to all active platforms)",
          },
          message: { type: "string", description: "Message content to send (Markdown supported)" },
          channel_id: { type: "string", description: "(Optional) Send to a specific channel/chat ID" },
        },
        required: ["platform", "message"],
      },
    },
    {
      name: "messenger_read",
      description: "Read recent messages.",
      inputSchema: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["discord", "telegram"], description: "Platform" },
          limit: { type: "integer", default: 10, description: "Number of messages to read" },
          channel_id: { type: "string", description: "(Optional) Specific channel ID" },
        },
        required: ["platform"],
      },
    },
    {
      name: "messenger_poll",
      description: "Poll for new unread messages. Fetches new updates from Telegram.",
      inputSchema: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["discord", "telegram", "all"], default: "all" },
        },
      },
    },
    {
      name: "messenger_status",
      description: "Check the current messenger connection status.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

// CallTool — 도구 실행 라우터
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "messenger_send":
        return await handleMessengerSend(args, clients);
      case "messenger_read":
        return await handleMessengerRead(args, clients);
      case "messenger_poll":
        return await handleMessengerPoll(args, clients, state);
      case "messenger_status":
        return handleMessengerStatus(args, CONFIG, state);
      default:
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Unknown tool: ${name}`, code: "UNKNOWN_TOOL" }) }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: error.message, code: "INTERNAL_ERROR" }) }],
      isError: true,
    };
  }
});

// ─── Start ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenClaw-CC Messenger Bot MCP Server running");
  console.error(`Discord: ${CONFIG.discord.enabled ? "enabled" : "disabled"}`);
  console.error(`Telegram: ${CONFIG.telegram.enabled ? "enabled" : "disabled"}`);
}

main().catch(console.error);
