# OpenClaw-CC

**Claude Code用自律AIアシスタントプラグイン**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 5つのMCPサーバー · 21のスキル · 3層永続メモリ · ナレッジグラフ · マルチエージェントオーケストレーション · Discord/Telegram連携

OpenClaw-CCは、Claude Codeをセッション間の永続メモリ、体系的デバッグ、自動リリース、QAサイクル、チームオーケストレーションを備えた自己学習型自律アシスタントに変換します。

---

## クイックスタート

### 前提条件
- [Claude Code](https://claude.ai/code) アクティブなサブスクリプション
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) プラグインインストール済み
- Node.js ≥ 18

### インストール

```bash
# 1. リポジトリをクローン
git clone https://github.com/Kit4Some/Oh-my-ClaudeClaw.git
cd Oh-my-ClaudeClaw

# 2. MCPサーバーの依存関係をインストール
cd mcp-servers/memory-manager && npm install && cd ../..
cd mcp-servers/knowledge-engine && npm install && cd ../..
cd mcp-servers/messenger-bot && npm install && cd ../..
cd mcp-servers/task-scheduler && npm install && cd ../..

# 3. Context Hubをインストール（オプション — APIドキュメント取得用）
npm install -g @aisuite/chub

# 4. スキルドキュメントを生成
node scripts/gen-skill-docs.mjs

# 5. Claude Codeで開く
claude
```

---

## MCPサーバー（5つ、31ツール）

| サーバー | ツール数 | 説明 |
|----------|----------|------|
| **memory-manager** | 9 | FTS5 + 連想検索による永続メモリ |
| **knowledge-engine** | 6 | ナレッジグラフ、トライグラム類似度、精製パイプライン |
| **messenger-bot** | 4 | Discord/Telegram双方向メッセージング |
| **task-scheduler** | 7 | cronベースのタスクスケジューリング |
| **context-hub** | 5 | キュレーションされたAPI/SDKドキュメントレジストリ（4,400+ライブラリ） |

---

## スキル（21個）

| スキル | 説明 |
|--------|------|
| `/ship` | 8.5ステップ自動リリース（テスト→カバレッジ→レビュー→コミット→PR） |
| `/investigate` | 6ステップ体系的デバッグ（Iron Law：根本原因確認後のみ修正） |
| `/code-review` | スコープドリフト検出 + Fix-Firstマルチパスレビュー |
| `/qa` | テスト→修正→検証サイクル + WTF-likelihood自己規制 |
| `/office-hours` | 6つの強制質問 + デザインドキュメント |
| `/freeze` | フックベースの編集スコープ制限 |
| `/careful` | 危険コマンド警告 |
| `/retro` | git+メモリ結合エンジニアリング振り返り |

---

## ビルダー哲学

1. **Boil the Lake** — AIにより完全な実装の限界コストがゼロに近づく
2. **Search Before Building** — まずメモリを検索、次に外部を検索
3. **Memory is Cheap** — 常に保存、常に検索
4. **Delegate or Die** — 適切なエージェントにタスクを委任

---

## 翻訳

- [English](README.md)
- [한국어 (Korean)](README.ko.md)
- [中文 (Chinese)](README.zh.md)

## ライセンス

[MIT](LICENSE) © Evan Lee (Kit4Some)
