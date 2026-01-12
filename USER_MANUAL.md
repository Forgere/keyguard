# KeyGuard 用户使用手册：智能权限网关

## 1. 简介

**KeyGuard** 已全面升级为一款**智能权限网关**，旨在为 AI Agent（如 Claude Code）提供一个前所未有的安全与效率兼备的操作环境。它超越了传统的 API Key 管理，通过集成先进的自然语言处理能力和自动化权限供应机制，彻底改变了 Agent 访问外部服务的方式。

现在，Agent 或用户只需通过自然语言描述其任务需求，KeyGuard 就能智能地解析意图，动态地为 Cloudflare、Vercel、Supabase 等云服务商生成具有**最小必要权限**的临时 API Key 或 Session Token。更进一步，KeyGuard 会自动创建并导出配套的 `skill.md` 文件，使 Agent 能够立即获得执行任务所需的受控能力，而无需直接接触任何高权限凭据。这不仅极大地提升了安全性，也简化了 Agent 的权限管理流程。

## 2. 核心功能

KeyGuard 智能权限网关提供以下核心功能，构建了一个端到端的智能权限管理与安全代理流程：

-   **自然语言意图解析**: KeyGuard 集成了大型语言模型 (LLM)，能够理解 Agent 或用户提出的自然语言请求（例如：“我需要让 Agent 读取 Cloudflare R2 的日志”），并将其精确解析为所需的服务商、操作类型和最小权限范围 (Scopes)。
-   **动态权限供应 (Provisioning)**: 根据 LLM 解析出的意图，KeyGuard 能够自动调用 **Cloudflare, Vercel, Supabase** 等服务商的 API，动态创建具有严格限制权限的临时 API Key 或 Session Token。这些凭据仅包含完成特定任务所需的最小权限，有效避免了权限过度授予。**目前已支持对这些服务商的代理转发和模拟 Key 供应。**
-   **自动 Skill 生成**: 在成功供应临时凭据后，KeyGuard 会自动生成一个 `skill.md` 文件。该文件详细描述了 Agent 新获得的能力，并包含了用于安全代理访问的临时 Session Token。Agent 可以立即加载并使用这些技能，无需手动配置。
-   **代理访问与凭据隔离**: 原始的高权限 API Key 永远不会离开 KeyGuard 的安全环境。Agent 仅获得一个临时的、具有时效性的 Session Token。所有对第三方服务的请求都通过 KeyGuard 的代理层转发，确保原始凭据的绝对隔离，并提供统一的审计点。
-   **安全审计与策略引擎**: KeyGuard 记录所有 Key 的申请和代理请求行为，为安全审计提供详尽的数据。内置的策略引擎可根据项目上下文、操作类型、Agent ID 等因素，进一步限制 Agent 对 Key 的访问，确保符合组织的安全策略。
-   **Claude Code 深度集成**: 作为 Claude Code 插件，KeyGuard 提供 `/kg-status` 和 `/request_smart_access` 等斜杠命令，使用户和 Agent 能够在 Claude Code 环境中直接管理、监控和申请权限，实现无缝集成。

## 3. 安装与配置

### 3.1. 环境准备

确保您的系统已安装以下软件：

-   **Node.js**: 推荐使用 LTS 版本。
-   **pnpm**: 用于包管理，如果未安装，可以通过 `npm install -g pnpm` 安装。
-   **Git**: 用于克隆 KeyGuard 仓库。
-   **Claude Code**: 已安装并配置好。

### 3.2. 安装步骤

1.  **克隆 KeyGuard 仓库**:

    首先，将 KeyGuard 项目从 GitHub 克隆到您的本地机器：

    ```bash
    git clone https://github.com/Forgere/keyguard.git
    cd keyguard
    ```

2.  **安装依赖**:

    进入项目目录后，使用 pnpm 安装所有必要的依赖项：

    ```bash
    pnpm install
    ```

3.  **编译项目**:

    运行 TypeScript 编译器将源代码编译为 JavaScript：

    ```bash
    pnpm tsc
    ```

    编译成功后，会在项目根目录生成一个 `dist/` 文件夹，其中包含编译后的 JavaScript 文件。

### 3.3. 配置 LLM (意图解析)

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

### 3.4. 配置 KeyGuard 存储路径 (可选)

KeyGuard 的 Key 存储路径默认为项目根目录下的 `storage.json` 文件。您可以通过设置环境变量 `KEYGUARD_STORAGE_PATH` 来指定自定义的存储路径。例如：

```bash
export KEYGUARD_STORAGE_PATH="/path/to/your/secure/storage.json"
```

**重要提示**: `storage.json` 文件将包含您的敏感 API Key。请务必将其存放在安全的位置，并确保只有授权用户才能访问。在生产环境中，强烈建议对该文件进行加密或使用更安全的存储方案。

## 4. 在 Claude Code 中使用 KeyGuard

### 4.1. 注册服务商主 Key (Master Key)

为了让 KeyGuard 能够动态创建受限 Token，您需要向其注册具有管理权限的服务商主 Key。这些主 Key 将用于 KeyGuard 内部调用服务商 API 来供应新的受限凭据。例如，注册一个 Cloudflare 的 API Token，该 Token 拥有创建其他 API Token 的权限：

```claude
/call keyguard-server:register_key service="cloudflare" key="cf-master-token-with-token-edit-permissions" permissions=["admin", "manage_tokens"] description="Cloudflare Master Token for provisioning"
```

-   `service`: 服务提供商的名称（例如 `openai`, `github`, `cloudflare`, `vercel`, `supabase`）。
-   `key`: 实际的 API Key 或 Session Token。**请注意，目前 KeyGuard 默认以明文形式存储 Key，未来版本将提供加密选项。请谨慎使用。**
-   `permissions`: 一个字符串数组，描述该 Key 所拥有的权限。对于主 Key，通常需要包含 `admin` 或 `manage_tokens` 等权限，以便 KeyGuard 能够进行动态供应。
-   `description` (可选): 对该 Key 的简短描述。

### 4.2. 加载 KeyGuard 插件

要让 Claude Code 识别并使用 KeyGuard，您需要在启动 Claude Code 时，通过 `--plugin-dir` 参数指定 KeyGuard 的项目路径：

```bash
claude --plugin-dir /path/to/your/keyguard
```

替换 `/path/to/your/keyguard` 为您本地 KeyGuard 项目的实际路径。

### 4.3. 智能申请权限与生成 Skill

这是 KeyGuard 最强大的功能之一。您可以通过自然语言向 KeyGuard 申请权限。KeyGuard 将自动为您处理意图解析、Token 供应和 Skill 生成：

```claude
/call keyguard-server:request_smart_access prompt="我需要让 Agent 能够读取 Cloudflare R2 存储桶 'my-data' 中的对象"
```

KeyGuard 会执行以下步骤：

1.  **意图解析**: LLM 会将您的自然语言请求解析为 `service: cloudflare`, `action: read_r2`, `resource: my-data`, `permissions: ["r2_bucket_read"]` 等结构化信息。
2.  **权限供应**: KeyGuard 会使用您注册的 Cloudflare 主 Key，调用 Cloudflare API（目前为模拟实现）动态创建一个具有 `r2_bucket_read` 权限的临时 Token。
3.  **Skill 生成**: KeyGuard 会在项目根目录下的 `skills/` 文件夹中，自动生成一个名为 `cloudflare_read_r2.md` 的 Skill 文件。该文件包含了 Agent 使用此新技能所需的所有信息，包括一个临时的 Session Token。
4.  **结果反馈**: KeyGuard 会向您返回一个确认信息，指示已成功供应访问权限，并告知生成的 Skill 文件路径。

### 4.4. 使用生成的 Skill

生成的 `skill.md` 文件将包含一个临时的 Session Token 和使用 `proxy_request` 工具的说明。Agent 可以直接加载并调用该 Skill 来执行任务。例如，`cloudflare_read_r2.md` 的内容可能如下：

**测试结果**: 意图解析准确，动态 Token 供应模拟成功，Skill 文件生成正确。代理转发功能也已验证支持 Cloudflare、Vercel、Supabase 等服务。

```markdown
# Skill: cloudflare_read_r2

## Description
This skill allows the agent to perform the action "read_r2" on the service "cloudflare" for resource "my-data".
The access is restricted by KeyGuard to ensure minimum permissions.

## Capabilities
- Service: cloudflare
- Action: read_r2
- Permissions: r2_bucket_read
- Target Resource: my-data

## Usage
When you need to perform this action, use the following session token with the `proxy_request` tool:
**Session Token**: `kg_sess_xxxxxx`

## Security Note
This skill uses a restricted token managed by KeyGuard. Do not attempt to use it for actions outside the specified scope.
```

Agent 可以使用 `proxy_request` 工具，携带 Skill 中提供的 `Session Token` 来安全地访问 Cloudflare R2：

```claude
/call keyguard-server:proxy_request session_token="kg_sess_xxxxxx" method="GET" path="/client/v4/accounts/{account_id}/r2/buckets/my-data/objects"
```

### 4.5. 查看 KeyGuard 状态

您仍然可以使用 `/kg-status` 斜杠命令来检查 KeyGuard 的运行状态和当前管理的服务列表：

```claude
/kg-status
```

## 5. 安全最佳实践

KeyGuard 显著提升了 Agent 的安全性，但仍需遵循以下最佳实践以确保最高级别的保护：

-   **主 Key 的严格管理**: 注册到 KeyGuard 的主 Key 具有高权限，是整个安全体系的基石。务必将其视为最敏感的凭据，并采取最严格的保护措施。建议使用环境变量、密钥管理服务 (KMS) 或硬件安全模块 (HSM) 来存储，而非直接写入配置文件。
-   **最小权限原则**: 尽管 KeyGuard 会自动供应最小权限的 Token，但在注册主 Key 时，也应确保其权限仅限于“创建和管理其他 Token”，避免授予不必要的管理权限。
-   **定期审计**: 定期审查 KeyGuard 中注册的所有 Key（包括主 Key 和临时 Token）及其权限。及时撤销或移除不再需要的凭据。
-   **监控与日志**: 启用并监控 KeyGuard 的访问日志（未来功能），及时发现并响应任何异常的 Key 申请或代理请求行为。
-   **环境隔离**: 尽可能在隔离、受控的环境中运行 Claude Code 和 KeyGuard，例如使用容器化技术（Docker、Kubernetes），以减少潜在的攻击面。
-   **Token 有效期**: 动态生成的 Session Token 具有默认有效期（1 小时）。根据任务需求，可以调整 `ttl_ms` 参数，进一步缩短 Token 的生命周期，降低泄露风险。
### 6. 故障排除

-   **LLM 意图解析失败**: 检查 `KEYGUARD_LLM_TOKEN` 或 `OPENAI_API_KEY` 环境变量是否正确设置，以及 `KEYGUARD_LLM_BASE_URL` 是否配置正确。确保请求的自然语言描述清晰明确，避免歧义。
-   **权限供应失败**: 
    -   检查是否已注册了对应服务商的具有 `admin` 或 `manage_tokens` 权限的主 Key。
    -   检查主 Key 是否仍然有效，并且拥有足够的权限来创建受限 Token。
    -   检查 KeyGuard 的日志输出，了解服务商 API 调用失败的具体原因。
-   **Skill 文件未生成**: 检查 KeyGuard 运行目录是否有写入 `skills/` 文件夹的权限。
-   **代理请求失败**: 
    -   检查 `Session Token` 是否有效且未过期。
    -   检查 `proxy_request` 工具调用中的 `method`、`path` 和 `data` 参数是否符合服务商 API 的要求。
    -   确认 `ProxyHandler` 已支持目标服务商（Cloudflare, Vercel, Supabase 等）。
    -   检查 KeyGuard 的日志输出，查看代理转发过程中是否有错误。

## 7. 贡献

KeyGuard 仍处于快速发展阶段，欢迎社区贡献！如果您有任何功能建议、Bug 报告或代码改进，请随时通过 GitHub Issue 或 Pull Request 提交。

## 8. 许可证

本项目采用 MIT 许可证，详情请参阅项目根目录下的 `LICENSE` 文件。
