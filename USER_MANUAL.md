# KeyGuard 用户使用手册

## 1. 简介

**KeyGuard** 是一个专为 AI Agent（如 Claude Code）设计的安全插件，旨在解决 Agent 在执行任务时可能因直接访问高权限 API Key 而带来的安全风险。它充当一个智能中间层，通过 Model Context Protocol (MCP) 协议，根据 Agent 的具体需求和预设的权限策略，动态地提供具有最小必要权限的服务商 Key 或 Session。这确保了 Agent 仅能访问其完成任务所需的资源，从而显著提升了安全性。

## 2. 核心功能

KeyGuard 提供以下核心功能：

-   **Key 注册与管理**: 用户可以安全地注册来自不同服务商（例如 OpenAI、GitHub、AWS 等）的 API Key 或 Session。这些 Key 可以被标记不同的权限等级和描述信息，便于管理。
-   **动态权限映射**: 当 Agent 需要访问某个服务时，KeyGuard 的 MCP 服务器会拦截请求，并根据 Agent 声明的所需权限，从其内部的 Key Vault 中智能匹配并返回一个具有最小必要权限的 Key。这意味着一个高权限的原始 Key 可以被映射为多个低权限的临时凭据。
-   **策略引擎**: KeyGuard 内置了一个可扩展的策略引擎。该引擎可以根据更复杂的上下文信息（如当前项目路径、操作类型、Agent ID 等）来评估 Agent 的访问请求，进一步细化权限控制，确保只有符合特定条件的请求才能获得 Key。
-   **Claude Code 集成**: KeyGuard 被设计为一个 Claude Code 插件，提供便捷的集成方式和专用的斜杠命令（如 `/kg-status`），使用户能够在 Claude Code 环境中直接管理和监控 KeyGuard 的运行状态。

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

### 3.3. 配置 KeyGuard

KeyGuard 的 Key 存储路径默认为项目根目录下的 `storage.json` 文件。您可以通过设置环境变量 `KEYGUARD_STORAGE_PATH` 来指定自定义的存储路径。例如：

```bash
export KEYGUARD_STORAGE_PATH="/path/to/your/secure/storage.json"
```

**重要提示**: `storage.json` 文件将包含您的敏感 API Key。请务必将其存放在安全的位置，并确保只有授权用户才能访问。在生产环境中，强烈建议对该文件进行加密或使用更安全的存储方案。

## 4. 在 Claude Code 中使用 KeyGuard

### 4.1. 加载 KeyGuard 插件

要让 Claude Code 识别并使用 KeyGuard，您需要在启动 Claude Code 时，通过 `--plugin-dir` 参数指定 KeyGuard 的项目路径：

```bash
claude --plugin-dir /path/to/your/keyguard
```

替换 `/path/to/your/keyguard` 为您本地 KeyGuard 项目的实际路径。

### 4.2. 查看 KeyGuard 状态

插件加载成功后，您可以在 Claude Code 中使用 `/kg-status` 斜杠命令来检查 KeyGuard 的运行状态和当前管理的服务列表：

```claude
/kg-status
```

该命令会调用 KeyGuard MCP 服务器的 `list_services` 工具，并以友好的方式展示结果。

### 4.3. 注册服务 Key

在 Agent 能够使用 KeyGuard 提供的 Key 之前，您需要将您的服务 Key 注册到 KeyGuard 的 Vault 中。这通过调用 `register_key` 工具完成：

```claude
/call keyguard-server:register_key service="openai" key="sk-YOUR_OPENAI_KEY_HERE" permissions=["text_generation", "image_generation"] description="我的个人 OpenAI Key，用于文本和图像生成"
```

-   `service`: 服务提供商的名称（例如 `openai`, `github`, `aws`）。
-   `key`: 实际的 API Key 或 Session Token。**请注意，目前 KeyGuard 默认以明文形式存储 Key，未来版本将提供加密选项。请谨慎使用。**
-   `permissions`: 一个字符串数组，描述该 Key 所拥有的权限。这些权限将用于后续的动态映射和策略匹配。
-   `description` (可选): 对该 Key 的简短描述。

成功注册后，KeyGuard 会返回一个确认信息，并包含该 Key 的唯一 ID。

### 4.4. Agent 如何获取映射 Key

当 Claude Code 中的 Agent 需要访问某个服务时，它会通过调用 KeyGuard MCP 服务器的 `get_mapped_key` 工具来请求 Key。Agent 需要提供所需的服务名称和权限列表：

```claude
/call keyguard-server:get_mapped_key service="openai" required_permissions=["text_generation"]
```

KeyGuard 服务器会执行以下操作：

1.  **策略检查**: 策略引擎会首先评估 Agent 的请求是否符合预设的访问策略。
2.  **Key 匹配**: 如果策略允许，KeyGuard 会在其 Vault 中查找与 `service` 和 `required_permissions` 最匹配的 Key。它会优先选择拥有所有所需权限且权限范围最小的 Key，以遵循最小权限原则。
3.  **返回 Key**: KeyGuard 会将匹配到的 Key 返回给 Agent。Agent 随后可以使用这个 Key 来与服务商进行交互。

**重要**: Agent 接收到的 Key 仍然是原始 Key。KeyGuard 的核心价值在于它控制了 **哪个 Key** 在 **什么情况下** 被 **哪个 Agent** 获取。未来的版本将考虑实现 Key 的动态生成或代理访问，以提供更强的隔离性。

### 4.5. 列出所有管理的服务

您可以使用 `/kg-status` 命令或直接调用 `list_services` 工具来查看 KeyGuard 当前管理的所有服务：

```claude
/call keyguard-server:list_services
```

## 5. 安全最佳实践

使用 KeyGuard 可以提升 Agent 的安全性，但仍需遵循以下最佳实践：

-   **最小权限原则**: 注册 Key 时，尽可能为每个 Key 分配最小的权限集。避免使用具有全局管理员权限的 Key。
-   **安全存储**: `storage.json` 文件包含敏感信息。请确保其存储在受保护的文件系统中，并限制访问权限。考虑使用文件加密或将 KeyGuard 集成到硬件安全模块 (HSM) 或密钥管理服务 (KMS) 中。
-   **定期审计**: 定期审查 KeyGuard 中注册的 Key 及其权限，移除不再需要的 Key。
-   **监控日志**: 监控 KeyGuard 的访问日志（未来功能），及时发现异常的 Key 请求行为。
-   **环境隔离**: 尽可能在隔离的环境中运行 Claude Code 和 KeyGuard，例如使用容器化技术。

## 6. 故障排除

-   **插件未加载**: 检查 Claude Code 启动命令中的 `--plugin-dir` 路径是否正确，以及 KeyGuard 项目是否已成功编译。
-   **Key 注册失败**: 检查 `register_key` 工具调用中的参数是否正确，特别是 `service`、`key` 和 `permissions` 字段。
-   **无法获取映射 Key**: 
    -   检查是否已注册了对应服务和权限的 Key。
    -   检查 `policy.ts` 中的策略是否阻止了访问。默认策略较为宽松，但如果您进行了修改，请确保其允许当前操作。
    -   检查 `storage.json` 文件是否存在且可读写。

## 7. 贡献

KeyGuard 仍处于早期开发阶段，欢迎社区贡献！如果您有任何功能建议、Bug 报告或代码改进，请随时通过 GitHub Issue 或 Pull Request 提交。

## 8. 许可证

本项目采用 MIT 许可证，详情请参阅项目根目录下的 `LICENSE` 文件。
