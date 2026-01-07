# KeyGuard: Claude Code 权限映射插件

## 项目概述

**KeyGuard** 是一个专为 AI Agent（如 Claude Code）设计的安全插件，旨在解决 Agent 权限过大的问题。它通过实现一个 Model Context Protocol (MCP) 服务器，作为服务商 Key/Session 的中间层，根据最小权限原则，动态地向 Agent 提供受限的、临时的访问凭据。这有效降低了直接暴露高权限 API Key 给 Agent 所带来的安全风险。

## 核心功能

- **Key 注册与管理**: 支持按服务商（例如 OpenAI, GitHub, AWS）和权限等级注册和管理 API Key 或 Session。
- **动态权限映射**: Agent 在执行任务时，KeyGuard MCP 服务器会根据请求的服务和所需权限，从 Vault 中智能匹配并返回具有最小必要权限的 Key。
- **策略引擎**: 内置策略引擎，可根据项目上下文、操作类型等因素，进一步限制 Agent 对 Key 的访问。
- **Claude Code 集成**: 作为 Claude Code 插件，提供 `/kg-status` 斜杠命令，方便用户查看 KeyGuard 状态和管理。

## 技术栈

- **语言**: TypeScript
- **协议**: Model Context Protocol (MCP)
- **运行时**: Node.js
- **依赖**: `@modelcontextprotocol/sdk`, `zod`

## 安装与使用 (Claude Code)

### 1. 克隆仓库

```bash
git clone https://github.com/Forgere/keyguard.git
cd keyguard
```

### 2. 安装依赖并编译

```bash
pnpm install
pnpm tsc
```

### 3. 作为 Claude Code 插件加载

在启动 Claude Code 时，使用 `--plugin-dir` 参数指向 KeyGuard 插件目录：

```bash
claude --plugin-dir /path/to/your/keyguard
```

### 4. 使用斜杠命令

在 Claude Code 中，您可以使用 `/keyguard:kg-status` 命令来检查 KeyGuard 服务器的状态和当前管理的服务。

### 5. 注册 Key

通过调用 `register_key` 工具来注册您的服务 Key。例如：

```claude
/call keyguard-server:register_key service="openai" key="sk-YOUR_OPENAI_KEY" permissions=["text_generation", "image_generation"]
description="My personal OpenAI key for general use"
```

### 6. 获取映射 Key

Agent 在需要访问服务时，会调用 `get_mapped_key` 工具。KeyGuard 会根据请求的 `service` 和 `required_permissions` 返回最合适的 Key。

```claude
/call keyguard-server:get_mapped_key service="openai" required_permissions=["text_generation"]
```

## 开发

### 项目结构

```
keyguard/
├── .claude-plugin/       # Claude Code 插件配置
│   └── plugin.json
├── src/
│   ├── index.ts          # MCP Server 入口
│   ├── vault.ts          # Key 存储和管理逻辑
│   └── policy.ts         # 权限策略引擎
├── commands/             # Claude Code 斜杠命令
│   └── kg-status.md
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

### 运行 MCP 服务器 (Standalone)

您也可以独立运行 MCP 服务器进行测试：

```bash
npx ts-node src/index.ts
```

## 未来增强

- **更复杂的策略引擎**: 支持基于 YAML/JSON 配置的复杂权限规则。
- **加密存储**: 实现更安全的 Key 加密和解密机制（例如使用系统 Keyring 或 KMS）。
- **OpenCode/VS Code 插件集成**: 提供 VS Code 插件，方便在 IDE 中管理 KeyGuard。
- **审计日志**: 详细记录 Key 访问日志，支持查询和分析。
- **Web UI**: 提供一个简单的 Web 界面来管理 Key 和策略。

## 用户使用手册

更详细的安装、配置和使用指南，请参阅 [USER_MANUAL.md](USER_MANUAL.md)。

## 贡献

欢迎提交 Issue 或 Pull Request 来改进 KeyGuard！

## 许可证

本项目采用 MIT 许可证。
