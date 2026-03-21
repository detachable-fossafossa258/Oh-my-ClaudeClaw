/**
 * 인메모리 메시지 큐
 *
 * 미읽은 메시지를 FIFO로 관리한다.
 * 영속성 불필요 — 서버 재시작 시 초기화.
 */

export class MessageQueue {
  constructor() {
    this.messages = [];
  }

  /**
   * 메시지를 큐 끝에 추가
   * @param {object} message
   */
  enqueue(message) {
    this.messages.push(message);
  }

  /**
   * 가장 오래된 메시지를 꺼냄 (FIFO)
   * @returns {object|undefined}
   */
  dequeue() {
    return this.messages.shift();
  }

  /**
   * 최근 n개 메시지 조회 (제거하지 않음)
   * @param {number} n - 조회할 개수
   * @returns {object[]}
   */
  peek(n = 10) {
    return this.messages.slice(-n);
  }

  /**
   * 큐 크기
   * @returns {number}
   */
  size() {
    return this.messages.length;
  }

  /**
   * 큐 비우기
   */
  clear() {
    this.messages = [];
  }
}
