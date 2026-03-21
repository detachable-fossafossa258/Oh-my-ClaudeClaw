/**
 * MCP 도구 핸들러 — messenger-bot
 *
 * interface-contracts.md §2 스키마 준수.
 * 4개 도구: messenger_send, messenger_read, messenger_poll, messenger_status
 */

// ─── 표준 응답 헬퍼 ─────────────────────────────────────────

function successResponse(data) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ success: true, ...data }, null, 2)
    }]
  };
}

function errorResponse(message, code = "ERROR") {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ success: false, error: message, code })
    }],
    isError: true
  };
}

// ─── 도구 핸들러 ────────────────────────────────────────────

/**
 * messenger_send — 메시지 전송
 * @param {object} args - { platform, message, channel_id? }
 * @param {object} clients - { discord, telegram }
 */
export async function handleMessengerSend(args, { discord, telegram }) {
  const { platform, message, channel_id } = args;

  if (!platform || !message) {
    return errorResponse("platform and message are required.", "VALIDATION_ERROR");
  }

  const results = {};

  if ((platform === "discord" || platform === "all") && discord) {
    if (discord.webhookUrl) {
      results.discord = await discord.sendWebhook(message);
    } else {
      results.discord = await discord.send(message, channel_id);
    }
  }

  if ((platform === "telegram" || platform === "all") && telegram) {
    results.telegram = await telegram.send(message, channel_id);
  }

  if (Object.keys(results).length === 0) {
    return errorResponse(
      `${platform} platform is not configured. Please check your environment variables.`,
      "PLATFORM_DISABLED"
    );
  }

  return successResponse({ results, message: "Message sent successfully" });
}

/**
 * messenger_read — 최근 메시지 읽기
 * @param {object} args - { platform, limit?, channel_id? }
 * @param {object} clients - { discord, telegram }
 */
export async function handleMessengerRead(args, { discord, telegram }) {
  const { platform, limit = 10, channel_id } = args;

  if (!platform) {
    return errorResponse("platform is required.", "VALIDATION_ERROR");
  }

  let messages = [];

  if (platform === "discord" && discord) {
    messages = (await discord.readMessages(channel_id, limit)) || [];
  } else if (platform === "telegram" && telegram) {
    messages = await telegram.getUpdates(limit);
  } else {
    return errorResponse(
      `${platform} platform is not configured or not supported.`,
      "PLATFORM_DISABLED"
    );
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({ count: messages.length, messages }, null, 2)
    }]
  };
}

/**
 * messenger_poll — 새 메시지 폴링
 * @param {object} args - { platform? }
 * @param {object} clients - { discord, telegram }
 * @param {object} state - { queue, lastPollTime, setLastPollTime }
 */
export async function handleMessengerPoll(args, { discord, telegram }, state) {
  const { platform = "all" } = args;
  let newMessages = [];

  if ((platform === "telegram" || platform === "all") && telegram) {
    const telegramMsgs = await telegram.getUpdates(20);
    newMessages = newMessages.concat(telegramMsgs);
  }

  if ((platform === "discord" || platform === "all") && discord) {
    const discordMsgs = (await discord.readMessages(null, 10)) || [];
    const filtered = discordMsgs.filter(m => m.timestamp > state.lastPollTime);
    newMessages = newMessages.concat(filtered);
  }

  state.setLastPollTime(new Date().toISOString());
  for (const msg of newMessages) {
    state.queue.enqueue(msg);
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        new_messages: newMessages.length,
        messages: newMessages,
        queue_size: state.queue.size(),
      }, null, 2)
    }]
  };
}

/**
 * messenger_status — 연결 상태 확인
 * @param {object} args - (없음)
 * @param {object} config - CONFIG 객체
 * @param {object} state - { queue, lastPollTime }
 */
export function handleMessengerStatus(args, config, state) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        discord: {
          enabled: config.discord.enabled,
          hasToken: !!config.discord.token,
          hasChannel: !!config.discord.channelId,
          hasWebhook: !!config.discord.webhookUrl,
        },
        telegram: {
          enabled: config.telegram.enabled,
          hasToken: !!config.telegram.token,
          hasChatId: !!config.telegram.chatId,
        },
        queue_size: state.queue.size(),
        last_poll: state.lastPollTime,
      }, null, 2)
    }]
  };
}
