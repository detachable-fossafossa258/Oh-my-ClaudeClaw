# OpenClaw-CC

**Claude Code 自主 AI 助手插件**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 5个MCP服务器 · 21个技能 · 3层持久化记忆 · 知识图谱 · 多智能体编排 · Discord/Telegram集成

OpenClaw-CC 将 Claude Code 转变为具有跨会话持久记忆、系统化调试、自动发布、QA循环和团队编排能力的自学习自主助手。

---

## 快速开始

### 前置要求
- [Claude Code](https://claude.ai/code) 活跃订阅
- [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) 插件已安装
- Node.js ≥ 18

### 安装

```bash
# 1. 克隆仓库
git clone https://github.com/Kit4Some/Oh-my-ClaudeClaw.git
cd Oh-my-ClaudeClaw

# 2. 安装MCP服务器依赖
cd mcp-servers/memory-manager && npm install && cd ../..
cd mcp-servers/knowledge-engine && npm install && cd ../..
cd mcp-servers/messenger-bot && npm install && cd ../..
cd mcp-servers/task-scheduler && npm install && cd ../..

# 3. 安装 Context Hub（可选 - 用于API文档获取）
npm install -g @aisuite/chub

# 4. 生成技能文档
node scripts/gen-skill-docs.mjs

# 5. 在 Claude Code 中打开
claude
```

---

## MCP 服务器（5个，31个工具）

| 服务器 | 工具数 | 描述 |
|--------|--------|------|
| **memory-manager** | 9 | FTS5 + 关联搜索的持久化记忆 |
| **knowledge-engine** | 6 | 知识图谱、三元组相似度、精炼管道 |
| **messenger-bot** | 4 | Discord/Telegram 双向消息 |
| **task-scheduler** | 7 | 基于cron的任务调度 |
| **context-hub** | 5 | 策划的API/SDK文档注册表（4,400+库） |

---

## 技能（21个）

| 技能 | 描述 |
|------|------|
| `/ship` | 8.5步自动发布（测试→覆盖率→评审→提交→PR） |
| `/investigate` | 6步系统化调试（Iron Law：先确认根因再修复） |
| `/code-review` | 范围漂移检测 + Fix-First 多轮评审 |
| `/qa` | 测试→修复→验证循环 + WTF-likelihood 自律 |
| `/office-hours` | 6个强制问题 + 设计文档 |
| `/freeze` | 基于Hook的编辑范围限制 |
| `/careful` | 危险命令警告 |
| `/retro` | git+记忆结合的工程回顾 |

---

## 构建者哲学

1. **Boil the Lake** — AI让完整实现的边际成本趋近于零
2. **Search Before Building** — 先搜索记忆，再搜索外部
3. **Memory is Cheap** — 始终存储，始终搜索
4. **Delegate or Die** — 将任务委派给合适的智能体

---

## 翻译

- [English](README.md)
- [한국어 (Korean)](README.ko.md)
- [日本語 (Japanese)](README.ja.md)

## 许可证

[MIT](LICENSE) © Evan Lee (Kit4Some)
