<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQyIDAtOC0zLjU4LTgtOHMzLjU4LTggOC04IDggMy41OCA4IDgtMy41OCA4LTggOHoiLz48L3N2Zz4="/>
  <img src="https://img.shields.io/badge/MCP_Servers-5-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Skills-21-orange?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Tools-31-blue?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge"/>
</p>

# OpenClaw-CC

**Claude Code 用自律 AI アシスタントプラグイン**

> Claude Code を自己進化する自律アシスタントへ。永続メモリ、体系的デバッグ、自動リリース、QA サイクル、マルチエージェントオーケストレーションを搭載。

**[クイックスタート](#-クイックスタート)** · **[機能](#-機能)** · **[スキル](#-スキル-21個)** · **[アーキテクチャ](#-アーキテクチャ)** · **[プラグインインストール](#-プラグインインストール)** · **[コントリビュート](CONTRIBUTING.md)**

---

## なぜ OpenClaw-CC なのか？

| 従来の方法 | OpenClaw-CC 使用時 |
|-----------|------------------|
| セッションのたびにゼロから開始 | **3層永続メモリ**で全セッション間のコンテキストを保持 |
| 手探りの手動デバッグ | **Iron Law に基づく 6 ステップ体系的デバッグ** |
| コピー＆ペーストのリリース作業 | **8.5 ステップ自動化 ship**（テスト→レビュー→PR） |
| 安全網なし | **Hook ベースのガードレール**（freeze、careful、guard） |
| 単一エージェントの限界 | **19 個の OMC エージェント** + プロジェクト専用 4 エージェントのオーケストレーション |
| 外部通知なし | **Discord/Telegram** リアルタイム通知 |
| 古い API 知識 | **Context Hub 経由で 4,400+ の厳選ドキュメント** |

---

## クイックスタート

### 方法 A：プラグインインストール（推奨）

```bash
# 1. マーケットプレイスを追加
/plugin marketplace add https://github.com/Kit4Some/Oh-my-ClaudeClaw

# 2. プラグインをインストール
/plugin install openclaw-cc@openclaw-cc

# 3. MCP 依存関係をインストール
cd ~/.claude/plugins/cache/openclaw-cc/openclaw-cc/latest
cd mcp-servers/memory-manager && npm install && cd ../..
cd mcp-servers/knowledge-engine && npm install && cd ../..
cd mcp-servers/messenger-bot && npm install && cd ../..
cd mcp-servers/task-scheduler && npm install && cd ../..
```

### 方法 B：手動インストール

```bash
# 1. クローン
git clone https://github.com/Kit4Some/Oh-my-ClaudeClaw.git
cd Oh-my-ClaudeClaw

# 2. 依存関係をインストール
for dir in mcp-servers/*/; do (cd "$dir" && npm install); done

# 3. （任意）API ドキュメント取得用 Context Hub をインストール
npm install -g @aisuite/chub

# 4. テンプレートからスキルを生成
node scripts/gen-skill-docs.mjs

# 5. 起動
claude
```

### 環境設定（任意）

Discord/Telegram 連携には `.env` ファイルを作成してください：

```bash
DISCORD_BOT_TOKEN=your_token
DISCORD_CHANNEL_ID=your_channel
DISCORD_WEBHOOK_URL=your_webhook
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 前提条件

- [Claude Code](https://claude.ai/code)（有効なサブスクリプションが必要）
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) プラグイン
- Node.js >= 18

---

## 機能

### 3 層永続メモリ

```
エピソード記憶 (30日)  →  ワーキング記憶 (30日)  →  長期記憶 (永久)
  daily-logs                tasks                      knowledge
  captures                  sessions                   projects
                            inbox                      people
```

- **FTS5 全文検索**：連想モード対応（5シグナルランキング）
- **ナレッジグラフ**：6種類の関係タイプ（related、derived、supersedes、blocks、contradicts、refines）
- **トライグラム類似度検索**：外部 API 不要での重複排除
- **自動精製パイプライン**：夜間重複排除、週次デケイ、月次サマリー

### マルチエージェントオーケストレーション

19 個の OMC エージェント + プロジェクトローカル 4 エージェント、インテリジェントルーティング：

| ティア | モデル | エージェント |
|--------|--------|------------|
| クイック | Haiku | explore、writer、comms-agent、session-manager |
| スタンダード | Sonnet | executor、debugger、tracer、verifier、test-engineer、designer、scientist、memory-specialist、research-agent |
| コンプレックス | Opus | analyst、planner、architect、critic、code-reviewer、code-simplifier、product-manager |

### 安全システム（gstack より）

| スキル | 保護内容 |
|--------|---------|
| `/freeze` | PreToolUse Hook 経由で指定ディレクトリ外の Edit/Write をブロック |
| `/careful` | `rm -rf`、`DROP TABLE`、`force-push`、`reset --hard` 等の実行前に警告 |
| `/guard` | freeze + careful を同時に有効化 |

### スキルテンプレートシステム

11 個の共有ブロックを使った `.tmpl` テンプレートから 21 個のスキルを生成 — 重複ゼロ：

```bash
node scripts/gen-skill-docs.mjs           # 全て再生成
node scripts/gen-skill-docs.mjs ship       # 単体再生成
node scripts/skill-check.mjs              # ヘルスダッシュボード
```

---

## アーキテクチャ

```
┌──────────────────────────────────────────────────────────────┐
│                       Claude Code                            │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────────┐ │
│  │ 21個スキル│  │ 4個エージェント│  │   oh-my-claudecode (OMC)  │ │
│  │ テンプレート│  │ memory    │  │   専門化19エージェント    │ │
│  │ 自動生成  │  │ comms     │  │   チームオーケストレーション│ │
│  │           │  │ research  │  │   LSP/AST/Python ツール   │ │
│  │           │  │ session   │  │   状態管理                │ │
│  └─────┬─────┘  └─────┬─────┘  └────────────┬──────────────┘ │
│        │               │                      │               │
│  ┌─────▼───────────────▼──────────────────────▼─────────────┐ │
│  │               5個 MCP サーバー（31個ツール）               │ │
│  │                                                           │ │
│  │  memory-manager (9)  ·  knowledge-engine (6)              │ │
│  │  messenger-bot  (4)  ·  task-scheduler  (7)               │ │
│  │  context-hub    (5)                                       │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │              3層永続メモリ                                  │ │
│  │                                                           │ │
│  │  エピソード (30日) ──→ ワーキング (30日) ──→ 長期 (∞)    │ │
│  │                                                           │ │
│  │  SQLite FTS5 · ナレッジグラフ · トライグラム類似度        │ │
│  │  連想検索（5シグナル）· 自動精製                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │           外部連携                                         │ │
│  │  Discord · Telegram · Context Hub（4,400+ API ドキュメント）│ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## MCP サーバー（5サーバー、31ツール）

| サーバー | ツール数 | 主要機能 |
|----------|--------|---------|
| **memory-manager** | 9 | `memory_store` `memory_search` `memory_get` `memory_update` `memory_delete` `memory_daily_log` `memory_search_date` `memory_list` `memory_stats` |
| **knowledge-engine** | 6 | `memory_link` `memory_graph` `memory_similar` `memory_refine` `memory_archive` `memory_reindex_trigrams` |
| **messenger-bot** | 4 | `messenger_send` `messenger_read` `messenger_poll` `messenger_status` |
| **task-scheduler** | 7 | `task_create` `task_list` `task_update` `task_delete` `task_run_now` `task_history` `task_generate_crontab` |
| **context-hub** | 5 | `chub_search` `chub_get` `chub_list` `chub_annotate` `chub_feedback` |

---

## スキル（21個）

### ワークフロースキル

| スキル | 機能 |
|--------|-----|
| `/ship` | **8.5 ステップリリース自動化**：プリフライト → マージベース → テスト → カバレッジ監査 → プリランディングレビュー → バージョンバンプ → 変更ログ → bisectable コミット → 検証ゲート → プッシュ → PR → 通知 |
| `/investigate` | **6 ステップ体系的デバッグ**：証拠収集 → 再現 → スコープロック → パターン分析 → 仮説検証（3 ストライクルール）→ リグレッションテスト付き検証済み修正 |
| `/code-review` | **マルチパスレビュー**：スコープドリフト検出 → 機械的自動修正（Pass 1）→ セキュリティ監査（Pass 2）→ 判断項目（Pass 3）→ ドキュメント鮮度確認 → WTF-likelihood ゲート |
| `/qa` | **テスト-修正-検証サイクル**：ベースライン → トリアージ（Quick/Standard/Exhaustive）→ アトミックコミットで修正ループ → リグレッションテスト → WTF-likelihood 自己規制（ハードキャップ：50修正） |
| `/office-hours` | **アイデア検証**：スタートアップモード（6つの強制質問）またはビルダーモード（生成的ブレインストーミング）→ 市場調査 → 前提への挑戦 → 強制的代替案 → 設計書 |
| `/retro` | **エンジニアリング振り返り**：git + メモリデータ → メトリクステーブル → 時間分布 → セッション検出 → コミット分析 → ホットスポット → フォーカススコア → ストリーク追跡 → トレンド比較 |

### コアスキル

| スキル | 機能 |
|--------|-----|
| `/task-analyzer` | 複雑なタスクを分解 → 適切なエージェントへルーティング → 実行 → 報告 |
| `/memory-ops` | 重要度スコア付きで永続メモリを保存・検索・整理 |
| `/research-collector` | 多角的なウェブリサーチ → 構造化出力 → 重複排除 → 保存 |
| `/daily-routine` | 朝のブリーフィング、タスク管理、夜のレビュー、週次回顧 |
| `/doc-fetcher` | Context Hub（4,400+ ライブラリ）からアノテーションとフィードバック付き API ドキュメントを取得 |

### 安全スキル

| スキル | 機能 |
|--------|-----|
| `/freeze` | 指定ディレクトリ外の Edit/Write をブロック（Hook ベース、セッションスコープ） |
| `/careful` | 破壊的コマンドの実行前に警告：`rm -rf`、`DROP TABLE`、`force-push`、`reset --hard` |
| `/guard` | 最高レベルの安全のために freeze + careful を同時に有効化 |
| `/unfreeze` | 編集制限を解除 |

### 高度なスキル

| スキル | 機能 |
|--------|-----|
| `/knowledge-refiner` | 重複検出、マージ、古いデータのアーカイブ、レイヤー昇格、再インデックス |
| `/session-tracker` | セッション間の継続性のため OMC 状態 + 永続メモリへのデュアル書き込み |
| `/web-researcher` | 証拠ランキングとナレッジグラフ統合を備えた多角的ウェブ検索 |
| `/autonomous-ops` | 24/7 メッセージ駆動自律ループ：ポーリング → 分析 → ディスパッチ → 永続化 → 報告 |
| `/knowledge-sync` | OMC エフェメラル状態と永続メモリ間の双方向同期 |
| `/deep-research` | 3 並列リサーチエージェント → アナリスト統合 → クリティック審査 → ナレッジグラフ拡張 |

---

## ビルダー哲学

`{{OCC_ETHOS}}` テンプレートブロックを通じて全スキルに組み込まれた 5 つの原則（[全文](docs/ETHOS.md)）：

| 原則 | 核心となる考え方 |
|------|---------------|
| **湖を沸かせ（Boil the Lake）** | AI は完全な実装の限界コストをほぼゼロにする。毎回完全なものを作れ。 |
| **作る前に検索せよ（Search Before Building）** | メモリ（L0）→ 標準パターン（L1）→ 最新トレンド（L2）→ 第一原理（L3） |
| **自分のために作れ（Build for Yourself）** | 実際の問題の具体性は、仮想問題の汎用性に勝る。 |
| **メモリは安い（Memory is Cheap）** | 常に保存し、常に検索せよ。精製パイプラインが整理を担う。 |
| **委任するか死ぬか（Delegate or Die）** | 適切なエージェント、適切なモデル。自己承認は禁物。執筆とレビューを分離せよ。 |

---

## プロジェクト構造

```
Oh-my-ClaudeClaw/
├── .claude-plugin/
│   ├── plugin.json            # プラグインマニフェスト
│   └── marketplace.json       # マーケットプレイスカタログ
├── .claude/
│   ├── agents/                # 4個のプロジェクトローカルエージェント（OMCクオリティのプロンプト）
│   └── settings.local.json    # 5個のライフサイクル Hook
├── .mcp.json                  # 5個の MCP サーバー設定
├── CLAUDE.md                  # プロジェクト指示（Claude Code がロード）
│
├── skills/                    # 21個のスキル
│   ├── {skill}/SKILL.md.tmpl  #   テンプレートソース（このファイルを編集）
│   └── {skill}/SKILL.md       #   自動生成（編集しないこと）
│
├── mcp-servers/
│   ├── memory-manager/        # 9個のツール — SQLite FTS5 + 連想検索
│   ├── knowledge-engine/      # 6個のツール — グラフ、類似度、精製
│   ├── messenger-bot/         # 4個のツール — Discord/Telegram
│   └── task-scheduler/        # 7個のツール — cron + claude CLI 実行
│
├── scripts/
│   ├── gen-skill-docs.mjs     # SKILL.md.tmpl → SKILL.md ジェネレーター
│   ├── skill-check.mjs        # ヘルスダッシュボード
│   ├── template-blocks/       # 11個の共有ブロック（preamble、memory など）
│   └── hooks/                 # 5個のライフサイクル Hook（.mjs）
│
├── memory-store/              # 永続メモリ（gitignore データ）
├── docs/ETHOS.md              # ビルダー哲学
├── package.json               # ビルドスクリプト
├── LICENSE                    # MIT
└── CONTRIBUTING.md            # コントリビューションガイドライン
```

---

## 仕組み

```
ユーザー：「この認証エラーをデバッグして」
     │
     ▼
┌─ キーワード検出 ──────────────────────────────┐
│  マッチ："debug" → /investigate を提案        │
└───────────────────────────┬───────────────────┘
                            ▼
┌─ /investigate スキル ─────────────────────────┐
│  1. memory_search(tag: "bug") → 過去のコンテキスト │
│  2. OMC tracer エージェント → 証拠収集         │
│  3. LSP ツール → 精密なコードナビゲーション    │
│  4. 再現 → スコープロック → パターンマッチ     │
│  5. 3 ストライク仮説検証                       │
│  6. OMC executor → 修正を実装                 │
│  7. OMC verifier → 検証 + リグレッションテスト │
│  8. memory_store → 将来のために永続化          │
│  9. messenger_send → 完了通知を送信            │
└───────────────────────────────────────────────┘
```

---

## 翻訳

| 言語 | リンク |
|------|--------|
| 英語 | [README.md](README.md) |
| 韓国語（한국어） | [README.ko.md](README.ko.md) |
| 中国語（中文） | [README.zh.md](README.zh.md) |
| 日本語 | [README.ja.md](README.ja.md)（このファイル） |

---

## コントリビュート

コントリビューションを歓迎します！詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください：
- 開発環境のセットアップとワークフロー
- 新しいスキル、MCP ツール、エージェントの追加方法
- テンプレートシステムの規約
- Pull request チェックリスト

---

## クレジット

以下のプロジェクトを基盤として構築：
- [Claude Code](https://claude.ai/code) — Anthropic
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) — Yeachan Heo
- [gstack](https://github.com/garrytan/gstack) パターン — Garry Tan
- [Context Hub](https://github.com/andrewyng/context-hub) — Andrew Ng

## ライセンス

[MIT](LICENSE) © Evan Lee (Kit4Some)
