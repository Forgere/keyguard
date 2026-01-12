# KeyGuard: Intelligent Permission Gateway

## Project Overview

**KeyGuard** has evolved from a simple API Key manager into a powerful **Intelligent Permission Gateway**. It aims to thoroughly address the security risks posed by AI Agents (such as Claude Code) directly accessing high-privilege API Keys when performing tasks. By introducing advanced features like natural language intent parsing, dynamic permission provisioning, and automated skill generation, KeyGuard provides Agents with a secure, controlled, and highly intelligent operating environment.

Agents no longer directly hold or manage sensitive credentials. Instead, KeyGuard acts as an intelligent intermediary, dynamically generating temporary credentials with **minimum necessary permissions** for service providers like Cloudflare, Vercel, and Supabase based on the Agent's natural language requests. It also automatically creates corresponding `skill.md` files, enabling Agents to perform tasks securely and efficiently.

## Core Features

KeyGuard offers the following core features, building an end-to-end intelligent permission management process:

-   **Natural Language Intent Parsing**: Integrates Large Language Models (LLM) to understand natural language requests from Agents or users (e.g., "I need the Agent to read Cloudflare R2 logs") and accurately parse them into the required service provider, operation type, and minimum permission scopes.
-   **Dynamic Permission Provisioning**: Based on the parsed intent, KeyGuard can automatically call the APIs of service providers like **Cloudflare, Vercel, and Supabase** to dynamically create temporary API Keys or Session Tokens with strictly limited permissions. These credentials contain only the minimum permissions required to complete specific tasks. Support for proxy forwarding and simulated key provisioning for these service providers has been implemented.
-   **Automated Skill Generation**: After successfully provisioning temporary credentials, KeyGuard automatically generates a `skill.md` file. This file details the Agent's newly acquired capabilities and includes a temporary Session Token for secure proxy access, allowing the Agent to use these skills immediately.
-   **Proxy Access and Credential Isolation**: Original high-privilege API Keys never leave KeyGuard's secure environment. Agents only receive a temporary, time-limited Session Token. All requests to third-party services are forwarded through KeyGuard's proxy layer, ensuring absolute isolation of original credentials and providing a unified audit point.
-   **Security Auditing and Policy Engine**: KeyGuard logs all Key application and proxy request behaviors, providing detailed data for security auditing. The built-in policy engine can further restrict Agent access to Keys based on factors like project context and operation type, ensuring compliance with organizational security policies.
-   **Deep Claude Code Integration**: As a Claude Code plugin, KeyGuard provides slash commands like `/kg-status` and `/request_smart_access`, enabling users and Agents to directly manage, monitor, and request permissions within the Claude Code environment.

## Technology Stack

-   **Language**: TypeScript
-   **Protocol**: Model Context Protocol (MCP)
-   **Runtime**: Node.js
-   **Core Dependencies**: `@modelcontextprotocol/sdk`, `zod`, `openai`, `axios`

## Installation and Usage (Claude Code)

### 1. Clone the Repository

```bash
git clone https://github.com/Forgere/keyguard.git
cd keyguard
```

### 2. Install Dependencies and Compile

```bash
pnpm install
pnpm tsc
```

### 3. Configure LLM (Intent Parsing)

KeyGuard's natural language intent parsing relies on an LLM service compatible with the OpenAI protocol. You can configure the following environment variables:

-   `KEYGUARD_LLM_TOKEN`: Your LLM service API Key. If not set, `OPENAI_API_KEY` will be attempted.
-   `KEYGUARD_LLM_BASE_URL`: The base URL for your LLM service. If not set, OpenAI's default API address will be used.

**Example Configuration (using a custom service):**

```bash
export KEYGUARD_LLM_TOKEN="sk-YOUR_CUSTOM_LLM_KEY"
export KEYGUARD_LLM_BASE_URL="https://api.your-custom-llm.com/v1"
```

**Example Configuration (using OpenAI):**

```bash
export OPENAI_API_KEY="sk-YOUR_OPENAI_API_KEY"
# Or
export KEYGUARD_LLM_TOKEN="sk-YOUR_OPENAI_API_KEY"
```

### 4. Register Service Provider Master Key

To enable KeyGuard to dynamically create restricted Tokens, you need to register a service provider master Key with management permissions. For example, register a Cloudflare API Token that has permissions to create other API Tokens:

```claude
/call keyguard-server:register_key service="cloudflare" key="cf-master-token-with-token-edit-permissions" permissions=["admin", "manage_tokens"] description="Cloudflare Master Token for provisioning"
```

**Important**: These master Keys have high privileges; please handle them with extreme care. KeyGuard stores them in a local `storage.json` file. In a production environment, it is strongly recommended to encrypt this file or use a more secure storage solution.

### 5. Load KeyGuard Plugin into Claude Code

When launching Claude Code, use the `--plugin-dir` parameter to point to the KeyGuard plugin directory:

```bash
claude --plugin-dir /path/to/your/keyguard
```

Replace `/path/to/your/keyguard` with the actual path to your local KeyGuard project.

### 6. Smart Access Request and Skill Generation

This is one of KeyGuard's most powerful features. You can request permissions from KeyGuard using natural language. KeyGuard will automatically handle Token provisioning and Skill generation. **This functionality has been successfully verified through actual testing!**

**Example Request:**

```claude
/call keyguard-server:request_smart_access prompt="I need the Agent to read Cloudflare R2 bucket 'my-data' objects"
```

KeyGuard will perform the following steps:

1.  **Intent Parsing**: The LLM will parse your natural language request into structured information such as `service: cloudflare`, `action: read_r2`, `resource: my-data`, `permissions: ["r2_bucket_read"]`.
2.  **Permission Provisioning**: KeyGuard will use your registered Cloudflare master Key to call the Cloudflare API (currently simulated) to dynamically create a temporary Token with `r2_bucket_read` permissions.
3.  **Skill Generation**: KeyGuard will automatically generate a `cloudflare_read_r2.md` Skill file in the `skills/` folder at the project root. This file contains all the information the Agent needs to use this new skill, including a temporary Session Token.
4.  **Result Feedback**: KeyGuard will return a confirmation message indicating successful access provisioning and the path to the generated Skill file.

**Test Results**: Intent parsing was accurate, dynamic Token provisioning simulation was successful, and Skill file generation was correct. Proxy forwarding functionality has also been verified to support Cloudflare, Vercel, and Supabase.

### 7. Using the Generated Skill

The generated `skill.md` file will contain a Session Token and instructions for using the `proxy_request` tool. The Agent can directly call `proxy_request` to execute tasks:

```claude
/call keyguard-server:proxy_request session_token="kg_sess_xxxxxx" method="GET" path="/client/v4/accounts/{account_id}/r2/buckets/my-data/objects"
```

## Development

### Project Structure

```
keyguard/
├── .claude-plugin/       # Claude Code Plugin Configuration
│   └── plugin.json
├── src/
│   ├── index.ts          # MCP Server Entry Point, integrates all core logic
│   ├── vault.ts          # Key/Session Storage and Management Logic
│   ├── policy.ts         # Permission Policy Engine
│   ├── proxy.ts          # Proxy Request Forwarding Logic
│   ├── intent.ts         # Natural Language Intent Parsing (LLM)
│   ├── provisioner.ts    # Dynamic Key Provisioning Logic (Cloudflare, Vercel, Supabase)
│   └── skill_generator.ts# Dynamic Skill.md Generator
├── commands/             # Claude Code Slash Commands
│   └── kg-status.md
├── skills/               # Directory for automatically generated Skill.md files
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

### Running the MCP Server (Standalone)

You can also run the MCP server independently for testing:

```bash
npx ts-node src/index.ts
```

## User Manual

For more detailed installation, configuration, and usage guides, please refer to [USER_MANUAL_EN.md](USER_MANUAL_EN.md).

## Contributing

KeyGuard is still under rapid development, and contributions from the community are welcome! If you have any feature suggestions, bug reports, or code improvements, please feel free to submit them via GitHub Issues or Pull Requests.

## License

This project is licensed under the MIT License. See the `LICENSE` file in the project root for details.
