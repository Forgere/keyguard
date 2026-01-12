# KeyGuard User Manual: Intelligent Permission Gateway

## 1. Introduction

**KeyGuard** has been fully upgraded to an **Intelligent Permission Gateway**, designed to provide AI Agents (such as Claude Code) with an unprecedented operating environment that combines security and efficiency. It goes beyond traditional API Key management by integrating advanced natural language processing capabilities and automated permission provisioning mechanisms, fundamentally changing how Agents access external services.

Now, Agents or users only need to describe their task requirements in natural language, and KeyGuard will intelligently parse the intent, dynamically generate temporary API Keys or Session Tokens with **minimum necessary permissions** for cloud service providers like Cloudflare, Vercel, and Supabase. Furthermore, KeyGuard automatically creates and exports corresponding `skill.md` files, enabling Agents to immediately acquire the controlled capabilities needed to perform tasks, without directly accessing any high-privilege credentials. This not only significantly enhances security but also simplifies the Agent's permission management process.

## 2. Core Features

KeyGuard Intelligent Permission Gateway offers the following core features, building an end-to-end intelligent permission management and secure proxy process:

-   **Natural Language Intent Parsing**: KeyGuard integrates Large Language Models (LLM) to understand natural language requests from Agents or users (e.g., "I need the Agent to read Cloudflare R2 logs") and accurately parse them into the required service provider, operation type, and minimum permission scopes.
-   **Dynamic Permission Provisioning**: Based on the LLM-parsed intent, KeyGuard can automatically call the APIs of service providers like **Cloudflare, Vercel, and Supabase** to dynamically create temporary API Keys or Session Tokens with strictly limited permissions. These credentials contain only the minimum permissions required to complete specific tasks, effectively preventing over-privileging. **Support for proxy forwarding and simulated key provisioning for these service providers has been implemented.**
-   **Automated Skill Generation**: After successfully provisioning temporary credentials, KeyGuard automatically generates a `skill.md` file. This file details the Agent's newly acquired capabilities and includes a temporary Session Token for secure proxy access. Agents can immediately load and use these skills without manual configuration.
-   **Proxy Access and Credential Isolation**: Original high-privilege API Keys never leave KeyGuard's secure environment. Agents only receive a temporary, time-limited Session Token. All requests to third-party services are forwarded through KeyGuard's proxy layer, ensuring absolute isolation of original credentials and providing a unified audit point.
-   **Security Auditing and Policy Engine**: KeyGuard logs all Key application and proxy request behaviors, providing detailed data for security auditing. The built-in policy engine can further restrict Agent access to Keys based on factors like project context and Agent ID, ensuring compliance with organizational security policies.
-   **Deep Claude Code Integration**: As a Claude Code plugin, KeyGuard provides slash commands like `/kg-status` and `/request_smart_access`, enabling users and Agents to directly manage, monitor, and request permissions within the Claude Code environment, achieving seamless integration.

## 3. Installation and Configuration

### 3.1. Environment Preparation

Ensure your system has the following software installed:

-   **Node.js**: Recommended LTS version.
-   **pnpm**: For package management. If not installed, you can install it via `npm install -g pnpm`.
-   **Git**: For cloning the KeyGuard repository.
-   **Claude Code**: Installed and configured.

### 3.2. Installation Steps

1.  **Clone the KeyGuard Repository**:

    First, clone the KeyGuard project from GitHub to your local machine:

    ```bash
    git clone https://github.com/Forgere/keyguard.git
    cd keyguard
    ```

2.  **Install Dependencies**:

    After entering the project directory, use pnpm to install all necessary dependencies:

    ```bash
    pnpm install
    ```

3.  **Compile the Project**:

    Run the TypeScript compiler to compile the source code into JavaScript:

    ```bash
    pnpm tsc
    ```

    Upon successful compilation, a `dist/` folder will be generated in the project root, containing the compiled JavaScript files.

### 3.3. Configure LLM (Intent Parsing)

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

### 3.4. Configure KeyGuard Storage Path (Optional)

KeyGuard's Key storage path defaults to `storage.json` in the project root. You can specify a custom storage path by setting the `KEYGUARD_STORAGE_PATH` environment variable. For example:

```bash
export KEYGUARD_STORAGE_PATH="/path/to/your/secure/storage.json"
```

**Important**: The `storage.json` file will contain your sensitive API Keys. Ensure it is stored in a secure location and accessible only by authorized users. In a production environment, it is strongly recommended to encrypt this file or use a more secure storage solution.

## 4. Using KeyGuard in Claude Code

### 4.1. Register Service Provider Master Key

To enable KeyGuard to dynamically create restricted Tokens, you need to register a service provider master Key with management permissions. These master Keys will be used internally by KeyGuard to call service provider APIs for provisioning new restricted credentials. For example, register a Cloudflare API Token that has permissions to create other API Tokens:

```claude
/call keyguard-server:register_key service="cloudflare" key="cf-master-token-with-token-edit-permissions" permissions=["admin", "manage_tokens"] description="Cloudflare Master Token for provisioning"
```

-   `service`: The name of the service provider (e.g., `openai`, `github`, `cloudflare`, `vercel`, `supabase`).
-   `key`: The actual API Key or Session Token. **Note: Currently, KeyGuard stores Keys in plain text by default; future versions will offer encryption options. Please use with caution.**
-   `permissions`: An array of strings describing the permissions held by this Key. For master Keys, this typically includes `admin` or `manage_tokens` permissions to allow KeyGuard to perform dynamic provisioning.
-   `description` (Optional): A brief description of the Key.

### 4.2. Load KeyGuard Plugin

To make Claude Code recognize and use KeyGuard, you need to specify the KeyGuard project path using the `--plugin-dir` parameter when launching Claude Code:

```bash
claude --plugin-dir /path/to/your/keyguard
```

Replace `/path/to/your/keyguard` with the actual path to your local KeyGuard project.

### 4.3. Smart Access Request and Skill Generation

This is one of KeyGuard's most powerful features. You can request permissions from KeyGuard using natural language. KeyGuard will automatically handle intent parsing, Token provisioning, and Skill generation:

```claude
/call keyguard-server:request_smart_access prompt="I need the Agent to read Cloudflare R2 bucket 'my-data' objects"
```

KeyGuard will perform the following steps:

1.  **Intent Parsing**: The LLM will parse your natural language request into structured information such as `service: cloudflare`, `action: read_r2`, `resource: my-data`, `permissions: ["r2_bucket_read"]`.
2.  **Permission Provisioning**: KeyGuard will use your registered Cloudflare master Key to call the Cloudflare API (currently simulated) to dynamically create a temporary Token with `r2_bucket_read` permissions.
3.  **Skill Generation**: KeyGuard will automatically generate a `cloudflare_read_r2.md` Skill file in the `skills/` folder at the project root. This file contains all the information the Agent needs to use this new skill, including a temporary Session Token.
4.  **Result Feedback**: KeyGuard will return a confirmation message indicating successful access provisioning and the path to the generated Skill file.

### 4.4. Using the Generated Skill

The generated `skill.md` file will contain a temporary Session Token and instructions for using the `proxy_request` tool. The Agent can directly load and call this Skill to execute tasks. For example, the content of `cloudflare_read_r2.md` might look like this:

**Test Results**: Intent parsing was accurate, dynamic Token provisioning simulation was successful, and Skill file generation was correct. Proxy forwarding functionality has also been verified to support Cloudflare, Vercel, and Supabase.

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

Agents can use the `proxy_request` tool, carrying the `Session Token` provided in the Skill, to securely access Cloudflare R2:

```claude
/call keyguard-server:proxy_request session_token="kg_sess_xxxxxx" method="GET" path="/client/v4/accounts/{account_id}/r2/buckets/my-data/objects"
```

### 4.5. Checking KeyGuard Status

You can still use the `/kg-status` slash command to check KeyGuard's operational status and the list of currently managed services:

```claude
/kg-status
```

## 5. Security Best Practices

KeyGuard significantly enhances Agent security, but the following best practices should still be followed to ensure the highest level of protection:

-   **Strict Management of Master Keys**: Master Keys registered with KeyGuard have high privileges and are the cornerstone of the entire security system. Treat them as the most sensitive credentials and implement the strictest protection measures. It is recommended to store them using environment variables, Key Management Services (KMS), or Hardware Security Modules (HSM), rather than directly in configuration files.
-   **Principle of Least Privilege**: Although KeyGuard automatically provisions least-privilege Tokens, when registering master Keys, ensure their permissions are limited to "creating and managing other Tokens" to avoid granting unnecessary administrative privileges.
-   **Regular Auditing**: Regularly review all Keys registered in KeyGuard (including master Keys and temporary Tokens) and their permissions. Revoke or remove credentials that are no longer needed in a timely manner.
-   **Monitoring and Logging**: Enable and monitor KeyGuard's access logs (future feature) to promptly detect and respond to any abnormal Key application or proxy request behavior.
-   **Environment Isolation**: Run Claude Code and KeyGuard in isolated, controlled environments as much as possible, for example, using containerization technologies (Docker, Kubernetes), to reduce potential attack surfaces.
-   **Token Expiration**: Dynamically generated Session Tokens have a default expiration period (1 hour). The `ttl_ms` parameter can be adjusted to further shorten the Token's lifecycle, reducing the risk of exposure.

## 6. Troubleshooting

-   **LLM Intent Parsing Failure**: Check if `KEYGUARD_LLM_TOKEN` or `OPENAI_API_KEY` environment variables are correctly set, and if `KEYGUARD_LLM_BASE_URL` is configured correctly. Ensure the natural language description of the request is clear and unambiguous.
-   **Permission Provisioning Failure**:
    -   Check if a master Key with `admin` or `manage_tokens` permissions for the corresponding service provider has been registered.
    -   Check if the master Key is still valid and has sufficient permissions to create restricted Tokens.
    -   Check KeyGuard's log output for specific reasons why the service provider API call failed.
-   **Skill File Not Generated**: Check if KeyGuard's running directory has write permissions for the `skills/` folder.
-   **Proxy Request Failure**:
    -   Check if the `Session Token` is valid and has not expired.
    -   Check if the `method`, `path`, and `data` parameters in the `proxy_request` tool call comply with the service provider's API requirements.
    -   Confirm that `ProxyHandler` supports the target service provider (Cloudflare, Vercel, Supabase, etc.).
    -   Check KeyGuard's log output for any errors during proxy forwarding.

## 7. Contributing

KeyGuard is still under rapid development, and contributions from the community are welcome! If you have any feature suggestions, bug reports, or code improvements, please feel free to submit them via GitHub Issues or Pull Requests.

## 8. License

This project is licensed under the MIT License. See the `LICENSE` file in the project root for details.
