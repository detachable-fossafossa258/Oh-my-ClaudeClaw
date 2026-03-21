#!/usr/bin/env node

/**
 * OpenClaw-CC Webhook Bridge
 * 
 * Discord/Telegram → Claude Code 실시간 연동 서버.
 * Telegram Bot Webhook 또는 Discord Interactions를 수신하여
 * claude CLI를 호출하고 응답을 반환합니다.
 * 
 * Usage:
 *   node scripts/webhook-bridge.js
 *   PORT=3333 node scripts/webhook-bridge.js
 * 
 * Telegram Webhook 설정:
 *   curl -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
 *     -d "url=https://your-domain.com/telegram/webhook"
 */

import http from "http";
import { execSync, exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(__dirname, "..");
const PORT = parseInt(process.env.PORT || "3210");
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MAX_RESPONSE_LENGTH = 4000;

// Load .env
try {
  const envFile = fs.readFileSync(path.join(PROJECT_DIR, ".env"), "utf-8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {}

// ─── Claude CLI Execution ───────────────────────────────────

async function runClaude(prompt, allowedTools = []) {
  const tools = allowedTools.length > 0
    ? `--allowedTools "${allowedTools.join(",")}"`
    : '--allowedTools "memory-manager,messenger-bot"';
  
  const cmd = `cd "${PROJECT_DIR}" && claude -p "${prompt.replace(/"/g, '\\"')}" ${tools} --output-format text`;
  
  return new Promise((resolve) => {
    exec(cmd, {
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, HOME: process.env.HOME },
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Claude error: ${error.message}`);
        resolve(`⚠️ 처리 중 오류: ${error.message.slice(0, 200)}`);
      } else {
        const response = stdout.trim();
        resolve(response.length > MAX_RESPONSE_LENGTH
          ? response.slice(0, MAX_RESPONSE_LENGTH) + "\n...(truncated)"
          : response);
      }
    });
  });
}

// ─── Telegram API ───────────────────────────────────────────

async function sendTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
    }),
  });
}

// ─── Request Handler ────────────────────────────────────────

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }
  
  // Telegram Webhook
  if (url.pathname === "/telegram/webhook" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      res.writeHead(200);
      res.end("ok");
      
      try {
        const update = JSON.parse(body);
        const message = update.message;
        if (!message?.text) return;
        
        const chatId = message.chat.id;
        const text = message.text;
        const username = message.from?.username || "unknown";
        
        console.log(`[Telegram] ${username}: ${text}`);
        
        // Command routing
        if (text === "/status") {
          await sendTelegram(chatId, "🟢 OpenClaw-CC is running");
          return;
        }
        
        if (text === "/memory") {
          const response = await runClaude("메모리 통계 보여줘", ["memory-manager"]);
          await sendTelegram(chatId, response);
          return;
        }
        
        if (text === "/briefing") {
          const response = await runClaude("오늘 모닝 브리핑 생성해줘", ["memory-manager"]);
          await sendTelegram(chatId, response);
          return;
        }
        
        if (text.startsWith("/ask ")) {
          const prompt = text.slice(5);
          await sendTelegram(chatId, "⏳ 처리 중...");
          const response = await runClaude(prompt);
          await sendTelegram(chatId, response);
          return;
        }
        
        if (text.startsWith("/save ")) {
          const content = text.slice(6);
          const response = await runClaude(
            `이 내용을 inbox에 저장해줘: ${content}`,
            ["memory-manager"]
          );
          await sendTelegram(chatId, response);
          return;
        }
        
        if (text.startsWith("/search ")) {
          const query = text.slice(8);
          const response = await runClaude(
            `메모리에서 "${query}" 검색해줘`,
            ["memory-manager"]
          );
          await sendTelegram(chatId, response);
          return;
        }
        
        if (text.startsWith("/")) {
          await sendTelegram(chatId, [
            "📋 *OpenClaw-CC Commands*",
            "",
            "/ask [질문] — Claude에게 질문",
            "/save [내용] — 메모리에 저장",
            "/search [키워드] — 메모리 검색",
            "/briefing — 모닝 브리핑",
            "/memory — 메모리 통계",
            "/status — 상태 확인",
          ].join("\n"));
          return;
        }
        
        // Default: treat as /ask
        await sendTelegram(chatId, "⏳ 처리 중...");
        const response = await runClaude(text);
        await sendTelegram(chatId, response);
        
      } catch (err) {
        console.error("Telegram handler error:", err);
      }
    });
    return;
  }
  
  // Discord Interaction Webhook (simplified)
  if (url.pathname === "/discord/webhook" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        
        // Discord verification
        if (data.type === 1) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ type: 1 }));
          return;
        }
        
        // Slash command
        if (data.type === 2) {
          const prompt = data.data?.options?.[0]?.value || "status";
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
          }));
          
          const response = await runClaude(prompt);
          
          // Follow up
          const webhookUrl = `https://discord.com/api/v10/webhooks/${data.application_id}/${data.token}/messages/@original`;
          await fetch(webhookUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: response }),
          });
          return;
        }
      } catch (err) {
        console.error("Discord handler error:", err);
      }
      
      res.writeHead(200);
      res.end("ok");
    });
    return;
  }
  
  // API endpoint for external integrations
  if (url.pathname === "/api/prompt" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { prompt, tools } = JSON.parse(body);
        const response = await runClaude(prompt, tools);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ response }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  // Default 404
  res.writeHead(404);
  res.end("Not found");
}

// ─── Start Server ───────────────────────────────────────────

const httpServer = http.createServer(handleRequest);
httpServer.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════╗`);
  console.log(`║   OpenClaw-CC Webhook Bridge             ║`);
  console.log(`║   Port: ${PORT}                            ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log(``);
  console.log(`Endpoints:`);
  console.log(`  POST /telegram/webhook  — Telegram bot webhook`);
  console.log(`  POST /discord/webhook   — Discord interaction webhook`);
  console.log(`  POST /api/prompt        — Direct API (JSON body: {prompt, tools})`);
  console.log(`  GET  /health            — Health check`);
  console.log(``);
  console.log(`Telegram: ${TELEGRAM_TOKEN ? "✅ configured" : "❌ no token"}`);
});
