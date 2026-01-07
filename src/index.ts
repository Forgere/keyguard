import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Vault } from "./vault.js";
import { PolicyEngine } from "./policy.js";
import { ProxyHandler } from "./proxy.js";

const vault = new Vault();

const server = new Server(
  {
    name: "keyguard-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 定义可用的工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "register_key",
        description: "Register a new service key with specific permissions",
        inputSchema: {
          type: "object",
          properties: {
            service: { type: "string", description: "Service provider name (e.g., openai, github)" },
            key: { type: "string", description: "The actual API key or session token" },
            permissions: { type: "array", items: { type: "string" }, description: "List of permissions this key has" },
            description: { type: "string", description: "Optional description" }
          },
          required: ["service", "key", "permissions"]
        }
      },
      {
        name: "get_mapped_key",
        description: "Get a key for a service that matches the required permissions",
        inputSchema: {
          type: "object",
          properties: {
            service: { type: "string", description: "Service provider name" },
            required_permissions: { type: "array", items: { type: "string" }, description: "Permissions needed for the current task" }
          },
          required: ["service", "required_permissions"]
        }
      },
      {
        name: "list_services",
        description: "List all services currently managed by KeyGuard",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_proxy_session",
        description: "Get a temporary session token for proxying requests to a service",
        inputSchema: {
          type: "object",
          properties: {
            service: { type: "string", description: "Service provider name" },
            required_permissions: { type: "array", items: { type: "string" }, description: "Permissions needed" },
            ttl_ms: { type: "number", description: "Time to live in milliseconds (default 1 hour)" }
          },
          required: ["service", "required_permissions"]
        }
      },
      {
        name: "proxy_request",
        description: "Make a proxied request to a service using a session token",
        inputSchema: {
          type: "object",
          properties: {
            session_token: { type: "string", description: "The temporary session token" },
            method: { type: "string", description: "HTTP method (GET, POST, etc.)" },
            path: { type: "string", description: "API path (e.g., /chat/completions)" },
            data: { type: "object", description: "Request body data" }
          },
          required: ["session_token", "method", "path"]
        }
      }
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "register_key") {
      const { service, key, permissions, description } = z.object({
        service: z.string(),
        key: z.string(),
        permissions: z.array(z.string()),
        description: z.string().optional()
      }).parse(args);

      const id = Math.random().toString(36).substring(7);
      vault.addKey({ id, service, key, permissions, description });
      return { content: [{ type: "text", text: `Successfully registered key for ${service} (ID: ${id})` }] };
    }

    if (name === "get_mapped_key") {
      const { service, required_permissions } = z.object({
        service: z.string(),
        required_permissions: z.array(z.string())
      }).parse(args);

      // 检查策略
      if (!PolicyEngine.canAccess(service, required_permissions, { projectPath: process.cwd() })) {
        return { 
          content: [{ type: "text", text: "Access denied by KeyGuard policy engine." }],
          isError: true 
        };
      }

      const bestKey = vault.findBestKey(service, required_permissions);
      if (!bestKey) {
        return { 
          content: [{ type: "text", text: `No suitable key found for ${service} with required permissions.` }],
          isError: true 
        };
      }

      return { content: [{ type: "text", text: `Mapped Key: ${bestKey.key}\nPermissions: ${bestKey.permissions.join(', ')}` }] };
    }

    if (name === "list_services") {
      const keys = vault.listKeys();
      const services = Array.from(new Set(keys.map(k => k.service)));
      return { content: [{ type: "text", text: `Managed services: ${services.join(', ') || 'None'}` }] };
    }

    if (name === "get_proxy_session") {
      const { service, required_permissions, ttl_ms } = z.object({
        service: z.string(),
        required_permissions: z.array(z.string()),
        ttl_ms: z.number().optional()
      }).parse(args);

      if (!PolicyEngine.canAccess(service, required_permissions, { projectPath: process.cwd() })) {
        return { content: [{ type: "text", text: "Access denied by policy." }], isError: true };
      }

      const bestKey = vault.findBestKey(service, required_permissions);
      if (!bestKey) {
        return { content: [{ type: "text", text: "No suitable key found." }], isError: true };
      }

      const token = vault.createSession(bestKey, required_permissions, ttl_ms);
      return { content: [{ type: "text", text: `Session Token: ${token}\nExpires in: ${ttl_ms || 3600000}ms` }] };
    }

    if (name === "proxy_request") {
      const { session_token, method, path, data } = z.object({
        session_token: z.string(),
        method: z.string(),
        path: z.string(),
        data: z.any().optional()
      }).parse(args);

      const session = vault.getSession(session_token);
      if (!session) {
        return { content: [{ type: "text", text: "Invalid or expired session token." }], isError: true };
      }

      const keyEntry = vault.getKey(session.keyId);
      if (!keyEntry) {
        return { content: [{ type: "text", text: "Associated key not found." }], isError: true };
      }

      const result = await ProxyHandler.forward(session.service, keyEntry.key, {
        method,
        url: path,
        data
      });

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KeyGuard MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
