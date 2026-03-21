/**
 * Discord REST API 클라이언트
 *
 * spec.md §2.2.1 구현.
 * - 메시지 전송 (2000자 분할)
 * - 웹훅 전송
 * - 메시지 읽기
 * - 레이트 리밋 관리
 * - 30초 타임아웃, 에러 시 null 반환
 */

const TIMEOUT_MS = 30000;

export class DiscordClient {
  constructor(token, channelId, webhookUrl = null) {
    this.token = token;
    this.channelId = channelId;
    this.webhookUrl = webhookUrl;
    this.baseUrl = "https://discord.com/api/v10";
    this.rateLimitRemaining = 50;
    this.rateLimitReset = 0;
  }

  /**
   * 메시지 전송 (2000자 초과 시 분할)
   * @param {string} content - 전송할 내용
   * @param {string|null} channelId - 대상 채널 (null이면 기본 채널)
   * @returns {Promise<object[]|null>} 전송 결과 배열 또는 에러 시 null
   */
  async send(content, channelId = null) {
    try {
      const chunks = this.splitMessage(content, 2000);
      const results = [];
      for (const chunk of chunks) {
        await this.waitForRateLimit();
        const res = await this._fetch(
          `${this.baseUrl}/channels/${channelId || this.channelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${this.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content: chunk }),
          }
        );
        if (!res) return null;
        this.updateRateLimit(res.headers);
        results.push(await res.json());
      }
      return results;
    } catch (error) {
      console.error("[DiscordClient] send error:", error.message);
      return null;
    }
  }

  /**
   * 웹훅으로 메시지 전송 (봇 토큰 불필요)
   * @param {string} content - 전송할 내용
   * @param {string} username - 웹훅 표시 이름
   * @returns {Promise<object|null>}
   */
  async sendWebhook(content, username = "OpenClaw-CC") {
    try {
      if (!this.webhookUrl) return null;
      const res = await this._fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, username }),
      });
      if (!res) return null;
      return res.ok ? { success: true } : { error: res.statusText };
    } catch (error) {
      console.error("[DiscordClient] sendWebhook error:", error.message);
      return null;
    }
  }

  /**
   * 최근 메시지 읽기
   * @param {string|null} channelId - 채널 ID
   * @param {number} limit - 최대 메시지 수
   * @returns {Promise<object[]|null>} [{id, author, content, timestamp, platform}]
   */
  async readMessages(channelId = null, limit = 10) {
    try {
      const targetChannel = channelId || this.channelId;
      await this.waitForRateLimit();
      const res = await this._fetch(
        `${this.baseUrl}/channels/${targetChannel}/messages?limit=${limit}`,
        {
          headers: { Authorization: `Bot ${this.token}` },
        }
      );
      if (!res) return null;
      this.updateRateLimit(res.headers);
      const messages = await res.json();
      return Array.isArray(messages)
        ? messages.map((m) => ({
            id: m.id,
            author: m.author?.username || "unknown",
            content: m.content,
            timestamp: m.timestamp,
            platform: "discord",
          }))
        : [];
    } catch (error) {
      console.error("[DiscordClient] readMessages error:", error.message);
      return null;
    }
  }

  /**
   * 메시지 분할 (줄바꿈 기준)
   * @param {string} text - 원본 텍스트
   * @param {number} maxLen - 최대 길이 (기본 2000)
   * @returns {string[]}
   */
  splitMessage(text, maxLen = 2000) {
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
   * 레이트 리밋 대기
   */
  async waitForRateLimit() {
    if (this.rateLimitRemaining <= 1) {
      const wait = this.rateLimitReset - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  }

  /**
   * 레이트 리밋 상태 업데이트
   * @param {Headers} headers - fetch 응답 헤더
   */
  updateRateLimit(headers) {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");
    if (remaining !== null) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }
    if (reset !== null) {
      this.rateLimitReset = parseFloat(reset) * 1000; // seconds → ms
    }
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
      console.error("[DiscordClient] fetch error:", error.message);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
