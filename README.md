# KeyGuard: 智能权限网关 (Intelligent Permission Gateway)

## 项目概述

**KeyGuard** 已从一个简单的 API Key 管理器进化为一款强大的**智能权限网关**。它旨在彻底解决 AI Agent（如 Claude Code）在执行任务时，因直接访问高权限 API Key 而带来的安全隐患。KeyGuard 通过引入自然语言意图解析、动态权限供应和自动技能生成等先进功能，为 Agent 提供一个安全、受控且高度智能化的操作环境。

Agent 不再直接持有或管理敏感凭据。相反，KeyGuard 充当一个智能中介，根据 Agent 的自然语言请求，动态地为 Cloudflare、Vercel、Supabase 等服务商生成具有最小必要权限的临时凭据，并自动创建相应的 `skill.md` 文件，使 Agent 能够安全、高效地执行任务。

## 核心功能

KeyGuard 提供以下核心功能，构建了一个端到端的智能权限管理流程：

-   **自然语言意图解析**: 集成大型语言模型 (LLM)，能够理解 Agent 或用户提出的自然语言请求（例如：“我需要让 Agent 读取 Cloudflare R2 的日志”），并将其精确解析为所需的服务商、操作类型和最小权限范围 (Scopes)。
-   **动态权限供应 (Provisioning)**: 根据解析出的意图，KeyGuard 能够自动调用 Cloudflare、Vercel、Supabase 等服务商的 API，动态创建具有严格限制权限的临时 API Key 或 Session Token。这些凭据仅包含完成特定任务所需的最小权限。
-   **自动 Skill 生成**: 在成功供应临时凭据后，KeyGuard 会自动生成一个 `skill.md` 文件。该文件详细描述了 Agent 新获得的能力，并包含了用于安全代理访问的临时 Session Token，Agent 可以立即使用这些技能。
-   **代理访问与凭据隔离**: 原始的高权限 API Key 永远不会离开 KeyGuard 的安全环境。Agent 仅获得一个临时的、具有时效性的 Session Token。所有对第三方服务的请求都通过 KeyGuard 的代理层转发，确保原始凭据的绝对隔离。
-   **安全审计与策略引擎**: KeyGuard 记录所有 Key 的申请和代理请求行为，为安全审计提供数据。内置的策略引擎可根据项目上下文、操作类型等因素，进一步限制 Agent 对 Key 的访问，确保符合组织的安全策略。
-   **Claude Code 深度集成**: 作为 Claude Code 插件，提供 `/kg-status` 和 `/request_smart_access` 等斜杠命令，使用户和 Agent 能够在 Claude Code 环境中直接管理、监控和申请权限。

## 技术栈

-   **语言**: TypeScript
-   **协议**: Model Context Protocol (MCP)
-   **运行时**: Node.js
-   **核心依赖**: `@modelcontextprotocol/sdk`, `zod`, `openai`, `axios`

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

### 3. 配置 LLM (意图解析)

KeyGuard 的自然语言意图解析功能依赖于一个兼容 OpenAI 协议的 LLM 服务。您可以配置以下环境变量：

-   `KEYGUARD_LLM_TOKEN`: 您的 LLM 服务 API Key。如果未设置，将尝试使用 `OPENAI_API_KEY`。
-   `KEYGUARD_LLM_BASE_URL`: 您的 LLM 服务的基础 URL。如果未设置，将使用 OpenAI 的默认 API 地址。

**示例配置 (使用自定义服务):**

```bash
export KEYGUARD_LLM_TOKEN="sk-YOUR_CUSTOM_LLM_KEY"
export KEYGUARD_LLM_BASE_URL="https://api.your-custom-llm.com/v1"
```

**示例配置 (使用 OpenAI):**

```bash
export OPENAI_API_KEY="sk-YOUR_OPENAI_API_KEY"
# 或者
export KEYGUARD_LLM_TOKEN="sk-YOUR_OPENAI_API_KEY"
```

### 4. 注册服务商主 Key (Master Key)

为了让 KeyGuard 能够动态创建受限 Token，您需要向其注册具有管理权限的服务商主 Key。例如，注册一个 Cloudflare 的 API Token，该 Token 拥有创建其他 API Token 的权限：

```claude
/call keyguard-server:register_key service="cloudflare" key="cf-master-token-with-token-edit-permissions" permissions=["admin", "manage_tokens"] description="Cloudflare Master Token for provisioning"
```

**重要提示**: 这些主 Key 具有高权限，请务必妥善保管。KeyGuard 会将其存储在本地的 `storage.json` 文件中。在生产环境中，强烈建议对该文件进行加密或使用更安全的存储方案。

### 5. 加载 KeyGuard 插件到 Claude Code

启动 Claude Code 时，使用 `--plugin-dir` 参数指向 KeyGuard 插件目录：

```bash
claude --plugin-dir /path/to/your/keyguard
```

### 6. 智能申请权限与生成 Skill

现在，您可以通过自然语言向 KeyGuard 申请权限。KeyGuard 将自动为您处理 Token 供应和 Skill 生成：

```claude
/call keyguard-server:request_smart_access prompt="我需要让 Agent 能够读取 Cloudflare R2 存储桶 'my-data' 中的对象"
```

KeyGuard 会解析您的请求，动态生成一个只读的 Cloudflare R2 Token，并创建一个名为 `cloudflare_read_r2.md` 的 Skill 文件在 `skills/` 目录下。Agent 即可使用该 Skill 安全地访问 R2 存储桶。

### 7. 使用生成的 Skill

生成的 `skill.md` 文件将包含一个 Session Token 和使用 `proxy_request` 工具的说明。Agent 可以直接调用 `proxy_request` 来执行任务：

```claude
/call keyguard-server:proxy_request session_token="kg_sess_xxxxxx" method="GET" path="/client/v4/accounts/{account_id}/r2/buckets/my-data/objects"
```

## 开发

### 项目结构

```
keyguard/
├── .claude-plugin/       # Claude Code 插件配置
│   └── plugin.json
├── src/
│   ├── index.ts          # MCP Server 入口，集成所有核心逻辑
│   ├── vault.ts          # Key/Session 存储和管理逻辑
│   ├── policy.ts         # 权限策略引擎
│   ├── proxy.ts          # 代理请求转发逻辑
│   ├── intent.ts         # 自然语言意图解析 (LLM)
│   ├── provisioner.ts    # 动态 Key 供应逻辑 (Cloudflare, Vercel, Supabase)
│   └── skill_generator.ts# 动态 Skill.md 生成器
├── commands/             # Claude Code 斜杠命令
│   └── kg-status.md
├── skills/               # 自动生成的 Skill.md 文件存放目录
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

### 运行 MCP 服务器 (Standalone)

您也可以独立运行 MCP 服务器进行测试：

```bash
npx ts-node src/index.ts
```

## 用户使用手册

更详细的安装、配置和使用指南，请参阅 [USER_MANUAL.md](USER_MANUAL.md)。

## 贡献

KeyGuard 仍处于快速发展阶段，欢迎社区贡献！如果您有任何功能建议、Bug 报告或代码改进，请随时通过 GitHub Issue 或 Pull Request 提交。

## 许可证

本项目采用 MIT 许可证，详情请参阅项目根目录下的 `LICENSE` 文件。
