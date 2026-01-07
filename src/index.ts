import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Vault } from "./vault.js";
import { PolicyEngine } from "./policy.js";

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
