<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-Plugin-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQyIDAtOC0zLjU4LTgtOHMzLjU4LTggOC04IDggMy41OCA4IDgtMy41OCA4LTggOHoiLz48L3N2Zz4="/>
  <img src="https://img.shields.io/badge/MCP_Servers-5-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Skills-21-orange?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Tools-31-blue?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge"/>
</p>

# OpenClaw-CC

**Claude Code 自主 AI 助手插件**

> 将 Claude Code 转变为自我进化的自主助手，具备持久化记忆、系统化调试、自动化发布、QA 循环和多智能体编排能力。

**[快速开始](#-快速开始)** · **[功能特性](#-功能特性)** · **[技能列表](#-技能-21个)** · **[架构设计](#-架构设计)** · **[插件安装](#-插件安装)** · **[贡献指南](CONTRIBUTING.md)**

---

## 为什么选择 OpenClaw-CC？

| 没有它 | 使用 OpenClaw-CC |
|--------|----------------|
| 每次会话从零开始 | **3层持久化记忆**，跨会话保留上下文 |
| 手动调试靠猜测 | **Iron Law 驱动的 6 步系统化调试** |
| 复制粘贴的发布流程 | **8.5 步自动化 ship**（测试→审查→PR） |
| 没有安全防护 | **基于 Hook 的防护栏**（freeze、careful、guard） |
| 单智能体局限性 | **19 个 OMC 智能体** + 4 个项目专属智能体编排 |
| 无外部通知 | **Discord/Telegram** 实时提醒 |
| API 知识陈旧 | **通过 Context Hub 访问 4,400+ 精选文档** |

---

## 快速开始

### 方式 A：插件安装（推荐）

```bash
# 1. 添加市场
/plugin marketplace add https://github.com/Kit4Some/Oh-my-ClaudeClaw

# 2. 安装插件
/plugin install openclaw-cc@openclaw-cc

# 3. 安装 MCP 依赖
cd ~/.claude/plugins/cache/openclaw-cc/openclaw-cc/latest
cd mcp-servers/memory-manager && npm install && cd ../..
cd mcp-servers/knowledge-engine && npm install && cd ../..
cd mcp-servers/messenger-bot && npm install && cd ../..
cd mcp-servers/task-scheduler && npm install && cd ../..
```

### 方式 B：手动安装

```bash
# 1. 克隆仓库
git clone https://github.com/Kit4Some/Oh-my-ClaudeClaw.git
cd Oh-my-ClaudeClaw

# 2. 安装依赖
for dir in mcp-servers/*/; do (cd "$dir" && npm install); done

# 3. （可选）安装 Context Hub 用于 API 文档获取
npm install -g @aisuite/chub

# 4. 从模板生成技能文档
node scripts/gen-skill-docs.mjs

# 5. 启动
claude
```

### 环境配置（可选）

如需 Discord/Telegram 集成，创建 `.env` 文件：

```bash
DISCORD_BOT_TOKEN=your_token
DISCORD_CHANNEL_ID=your_channel
DISCORD_WEBHOOK_URL=your_webhook
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 前置要求

- [Claude Code](https://claude.ai/code)（需要有效订阅）
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) 插件
- Node.js >= 18

---

## 功能特性

### 3 层持久化记忆

```
情节记忆 (30天)  →  工作记忆 (30天)  →  长期记忆 (永久)
  daily-logs          tasks                knowledge
  captures            sessions             projects
                      inbox                people
```

- **FTS5 全文检索**：支持关联模式（5 信号加权排名）
- **知识图谱**：6 种关系类型（related、derived、supersedes、blocks、contradicts、refines）
- **三元组相似度搜索**：无需外部 API 即可去重
- **自动精炼管道**：每日去重、每周衰减、每月摘要

### 多智能体编排

19 个 OMC 智能体 + 4 个项目本地智能体，智能路由：

| 级别 | 模型 | 智能体 |
|------|------|--------|
| 快速任务 | Haiku | explore、writer、comms-agent、session-manager |
| 标准任务 | Sonnet | executor、debugger、tracer、verifier、test-engineer、designer、scientist、memory-specialist、research-agent |
| 复杂任务 | Opus | analyst、planner、architect、critic、code-reviewer、code-simplifier、product-manager |

### 安全系统（来自 gstack）

| 技能 | 保护内容 |
|------|---------|
| `/freeze` | 通过 PreToolUse Hook 阻止在指定目录外的 Edit/Write 操作 |
| `/careful` | 执行 `rm -rf`、`DROP TABLE`、`force-push`、`reset --hard` 等操作前发出警告 |
| `/guard` | 同时激活 freeze + careful |

### 技能模板系统

从 `.tmpl` 模板生成 21 个技能，使用 11 个共享块——零重复：

```bash
node scripts/gen-skill-docs.mjs           # 重新生成全部
node scripts/gen-skill-docs.mjs ship       # 重新生成单个
node scripts/skill-check.mjs              # 健康状态仪表盘
```

---

## 架构设计

```
┌──────────────────────────────────────────────────────────────┐
│                       Claude Code                            │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────────┐ │
│  │ 21个技能  │  │ 4个智能体  │  │   oh-my-claudecode (OMC)  │ │
│  │ 模板      │  │ memory    │  │   19个专业智能体           │ │
│  │ 自动生成  │  │ comms     │  │   团队编排                 │ │
│  │           │  │ research  │  │   LSP/AST/Python 工具     │ │
│  │           │  │ session   │  │   状态管理                 │ │
│  └─────┬─────┘  └─────┬─────┘  └────────────┬──────────────┘ │
│        │               │                      │               │
│  ┌─────▼───────────────▼──────────────────────▼─────────────┐ │
│  │               5个 MCP 服务器（31个工具）                   │ │
│  │                                                           │ │
│  │  memory-manager (9)  ·  knowledge-engine (6)              │ │
│  │  messenger-bot  (4)  ·  task-scheduler  (7)               │ │
│  │  context-hub    (5)                                       │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │              3层持久化记忆                                  │ │
│  │                                                           │ │
│  │  情节记忆 (30天) ──→ 工作记忆 (30天) ──→ 长期记忆 (∞)    │ │
│  │                                                           │ │
│  │  SQLite FTS5 · 知识图谱 · 三元组相似度                    │ │
│  │  关联搜索（5信号）· 自动精炼                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │           外部集成                                         │ │
│  │  Discord · Telegram · Context Hub（4,400+ API 文档）       │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## MCP 服务器（5个服务器，31个工具）

| 服务器 | 工具数 | 核心功能 |
|--------|--------|---------|
| **memory-manager** | 9 | `memory_store` `memory_search` `memory_get` `memory_update` `memory_delete` `memory_daily_log` `memory_search_date` `memory_list` `memory_stats` |
| **knowledge-engine** | 6 | `memory_link` `memory_graph` `memory_similar` `memory_refine` `memory_archive` `memory_reindex_trigrams` |
| **messenger-bot** | 4 | `messenger_send` `messenger_read` `messenger_poll` `messenger_status` |
| **task-scheduler** | 7 | `task_create` `task_list` `task_update` `task_delete` `task_run_now` `task_history` `task_generate_crontab` |
| **context-hub** | 5 | `chub_search` `chub_get` `chub_list` `chub_annotate` `chub_feedback` |

---

## 技能（21个）

### 工作流技能

| 技能 | 功能说明 |
|------|---------|
| `/ship` | **8.5 步发布自动化**：预检 → 合并基线 → 测试 → 覆盖率审计 → 预落地审查 → 版本号更新 → 变更日志 → bisectable 提交 → 验证门控 → 推送 → PR → 通知 |
| `/investigate` | **6 步系统化调试**：收集证据 → 复现 → 范围锁定 → 模式分析 → 假设验证（3 次尝试规则）→ 含回归测试的已验证修复 |
| `/code-review` | **多轮审查**：范围漂移检测 → 机械式自动修复（第 1 轮）→ 安全审计（第 2 轮）→ 判断项（第 3 轮）→ 文档时效检查 → WTF-likelihood 门控 |
| `/qa` | **测试-修复-验证循环**：基线 → 分级（Quick/Standard/Exhaustive）→ 原子提交修复循环 → 回归测试 → WTF-likelihood 自律（硬上限：50次修复） |
| `/office-hours` | **创意验证**：创业模式（6个强制问题）或构建者模式（生成式头脑风暴）→ 市场调研 → 前提挑战 → 强制替代方案 → 设计文档 |
| `/retro` | **工程回顾**：git + 记忆数据 → 指标表格 → 时间分布 → 会话检测 → 提交分析 → 热点识别 → 专注度评分 → 连续记录 → 趋势对比 |

### 核心技能

| 技能 | 功能说明 |
|------|---------|
| `/task-analyzer` | 分解复杂任务 → 路由至合适智能体 → 执行 → 报告 |
| `/memory-ops` | 带重要性评分地存储、搜索、整理持久化记忆 |
| `/research-collector` | 多角度网络调研 → 结构化输出 → 去重 → 存储 |
| `/daily-routine` | 早间简报、任务管理、晚间复盘、每周回顾 |
| `/doc-fetcher` | 从 Context Hub（4,400+ 库）获取带注释和反馈的 API 文档 |

### 安全技能

| 技能 | 功能说明 |
|------|---------|
| `/freeze` | 阻止在指定目录外的 Edit/Write（基于 Hook，会话范围） |
| `/careful` | 执行破坏性命令前发出警告：`rm -rf`、`DROP TABLE`、`force-push`、`reset --hard` |
| `/guard` | 同时激活 freeze + careful，提供最高级别安全保护 |
| `/unfreeze` | 解除编辑限制 |

### 高级技能

| 技能 | 功能说明 |
|------|---------|
| `/knowledge-refiner` | 检测重复、合并、归档过期内容、提升记忆层级、重建索引 |
| `/session-tracker` | 同时写入 OMC 状态 + 持久化记忆，实现跨会话连续性 |
| `/web-researcher` | 多角度网络搜索，带证据排名和知识图谱集成 |
| `/autonomous-ops` | 24/7 消息驱动自主循环：轮询 → 分析 → 分发 → 持久化 → 报告 |
| `/knowledge-sync` | OMC 临时状态与持久化记忆之间的双向同步 |
| `/deep-research` | 3 个并行调研智能体 → 分析师综合 → 评论者审核 → 知识图谱扩展 |

---

## 构建者哲学

通过 `{{OCC_ETHOS}}` 模板块嵌入每个技能的 5 条原则（[完整文档](docs/ETHOS.md)）：

| 原则 | 核心思想 |
|------|---------|
| **煮沸湖泊（Boil the Lake）** | AI 使完整实现的边际成本趋近于零。每次都做完整的事。 |
| **先搜索再构建（Search Before Building）** | 记忆（L0）→ 标准模式（L1）→ 当前趋势（L2）→ 第一原则（L3） |
| **为自己而建（Build for Yourself）** | 真实问题的具体性胜过假想问题的通用性。 |
| **记忆很廉价（Memory is Cheap）** | 始终存储，始终搜索。让精炼管道负责清理。 |
| **委托或消亡（Delegate or Die）** | 合适的智能体，合适的模型。绝不自我审批。写作与审查分离。 |

---

## 项目结构

```
Oh-my-ClaudeClaw/
├── .claude-plugin/
│   ├── plugin.json            # 插件清单
│   └── marketplace.json       # 市场目录
├── .claude/
│   ├── agents/                # 4个项目本地智能体（OMC 级别提示词）
│   └── settings.local.json    # 5个生命周期 Hook
├── .mcp.json                  # 5个 MCP 服务器配置
├── CLAUDE.md                  # 项目指令（由 Claude Code 加载）
│
├── skills/                    # 21个技能
│   ├── {skill}/SKILL.md.tmpl  #   模板源文件（编辑此文件）
│   └── {skill}/SKILL.md       #   自动生成（请勿编辑）
│
├── mcp-servers/
│   ├── memory-manager/        # 9个工具 — SQLite FTS5 + 关联搜索
│   ├── knowledge-engine/      # 6个工具 — 图谱、相似度、精炼
│   ├── messenger-bot/         # 4个工具 — Discord/Telegram
│   └── task-scheduler/        # 7个工具 — cron + claude CLI 执行
│
├── scripts/
│   ├── gen-skill-docs.mjs     # SKILL.md.tmpl → SKILL.md 生成器
│   ├── skill-check.mjs        # 健康状态仪表盘
│   ├── template-blocks/       # 11个共享块（preamble、memory 等）
│   └── hooks/                 # 5个生命周期 Hook（.mjs）
│
├── memory-store/              # 持久化记忆（gitignore 数据）
├── docs/ETHOS.md              # 构建者哲学
├── package.json               # 构建脚本
├── LICENSE                    # MIT
└── CONTRIBUTING.md            # 贡献指南
```

---

## 工作原理

```
用户说："帮我调试这个认证错误"
     │
     ▼
┌─ 关键词检测 ──────────────────────────────────┐
│  匹配："debug" → 建议使用 /investigate        │
└───────────────────────────┬───────────────────┘
                            ▼
┌─ /investigate 技能 ───────────────────────────┐
│  1. memory_search(tag: "bug") → 历史上下文    │
│  2. OMC tracer 智能体 → 收集证据              │
│  3. LSP 工具 → 精确代码导航                   │
│  4. 复现 → 范围锁定 → 模式匹配               │
│  5. 3 次尝试假设验证                          │
│  6. OMC executor → 实施修复                   │
│  7. OMC verifier → 验证 + 回归测试            │
│  8. memory_store → 持久化供未来参考           │
│  9. messenger_send → 发送完成通知             │
└───────────────────────────────────────────────┘
```

---

## 翻译版本

| 语言 | 链接 |
|------|------|
| 英语 | [README.md](README.md) |
| 韩语（한국어） | [README.ko.md](README.ko.md) |
| 简体中文 | [README.zh.md](README.zh.md)（本文件） |
| 日语（日本語） | [README.ja.md](README.ja.md) |

---

## 贡献

欢迎贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)：
- 开发环境设置与工作流
- 如何添加新技能、MCP 工具或智能体
- 模板系统规范
- Pull request 检查清单

---

## 致谢

基于以下项目构建：
- [Claude Code](https://claude.ai/code) — Anthropic
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) — Yeachan Heo
- [gstack](https://github.com/garrytan/gstack) 模式 — Garry Tan
- [Context Hub](https://github.com/andrewyng/context-hub) — Andrew Ng

## 许可证

[MIT](LICENSE) © Evan Lee (Kit4Some)
