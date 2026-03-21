/**
 * Telegram Bot API 클라이언트
 *
 * spec.md §2.2.2 구현.
 * - 메시지 전송 (4096자 분할, Markdown/MarkdownV2)
 * - 새 메시지 수신 (offset 기반 중복 방지)
 * - MarkdownV2 특수문자 이스케이핑
 * - 30초 타임아웃, 에러 시 null/[] 반환
 */

const TIMEOUT_MS = 30000;

export class TelegramClient {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.lastUpdateId = 0;
  }

  /**
   * 메시지 전송 (4096자 초과 시 분할)
   * @param {string} text - 전송할 텍스트
   * @param {string|null} chatId - 대상 챗 ID (null이면 기본)
   * @param {string} parseMode - 파싱 모드 (Markdown | MarkdownV2 | HTML)
   * @returns {Promise<object[]|null>} 전송 결과 배열 또는 에러 시 null
   */
  async send(text, chatId = null, parseMode = "Markdown") {
    try {
      const chunks = this.splitMessage(text, 4096);
      const results = [];
      for (const chunk of chunks) {
        const body = {
          chat_id: chatId || this.chatId,
          text: parseMode === "MarkdownV2" ? this.escapeMarkdownV2(chunk) : chunk,
          parse_mode: parseMode,
        };
        const res = await this._fetch(`${this.baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res) return null;
        results.push(await res.json());
      }
      return results;
    } catch (error) {
      console.error("[TelegramClient] send error:", error.message);
      return null;
    }
  }

  /**
   * 새 메시지 수신 (offset 기반 중복 방지)
   * @param {number} limit - 최대 업데이트 수
   * @returns {Promise<object[]>} [{id, author, content, timestamp, platform, chatId}]
   */
  async getUpdates(limit = 10) {
    try {
      const res = await this._fetch(
        `${this.baseUrl}/getUpdates?offset=${this.lastUpdateId + 1}&limit=${limit}&timeout=0`
      );
      if (!res) return [];
      const data = await res.json();
      if (!data.ok || !data.result?.length) return [];

      return data.result
        .filter((u) => u.message)
        .map((u) => {
          this.lastUpdateId = Math.max(this.lastUpdateId, u.update_id);
          return {
            id: u.message.message_id,
            author: u.message.from?.username || u.message.from?.first_name || "unknown",
            content: u.message.text || "",
            timestamp: new Date(u.message.date * 1000).toISOString(),
            platform: "telegram",
            chatId: u.message.chat.id,
          };
        });
    } catch (error) {
      console.error("[TelegramClient] getUpdates error:", error.message);
      return [];
    }
  }

  /**
   * 메시지 분할 (줄바꿈 기준)
   * @param {string} text - 원본 텍스트
   * @param {number} maxLen - 최대 길이 (기본 4096)
   * @returns {string[]}
   */
  splitMessage(text, maxLen = 4096) {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    while (text.length > 0) {
      let split = text.lastIndexOf("\n", maxLen);
      if (split <= 0) split = maxLen;
      chunks.push(text.slice(0, split));
      text = text.slice(split);
    }
    return chunks;
  }

  /**
   * MarkdownV2 특수문자 이스케이핑
   * @param {string} text
   * @returns {string}
   */
  escapeMarkdownV2(text) {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
  }

  /**
   * 타임아웃 적용 fetch (30초)
   * @param {string} url
   * @param {object} options - fetch options
   * @returns {Promise<Response|null>}
   */
  async _fetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } catch (error) {
      console.error("[TelegramClient] fetch error:", error.message);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
