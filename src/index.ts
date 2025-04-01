import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Basic configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Create MCP server
const server = new McpServer({
  name: 'ast-mcp',
  version: '0.1.0'
});

// Tool registry
interface Tool {
  name: string;
  description: string;
  schema: {
    [key: string]: z.ZodType<any>;
  };
  handler: (params: any) => Promise<any>;
}

const tools: Record<string, Tool> = {};

// Register a tool with both our internal registry and MCP server
function registerTool(tool: Tool) {
  tools[tool.name] = tool;
  
  // Register tool with MCP server
  server.tool(
    tool.name,
    tool.schema,
    async (params: any) => {
      const result = await tool.handler(params);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }]
      };
    }
  );
  
  console.log(`Tool registered: ${tool.name}`);
}

// Example tool registration
registerTool({
  name: 'echo',
  description: 'Echoes back the input message',
  schema: {
    message: z.string().describe('The message to echo back')
  },
  handler: async (params) => {
    return { message: params.message };
  }
});

// Start server with stdio transport
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log(`MCP server running with stdio transport, log level: ${LOG_LEVEL}`);
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

startServer();

export { registerTool };