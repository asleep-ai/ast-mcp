import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';

// Basic configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const AST_ID = process.env.AST_ID;
const AST_API_KEY = process.env.AST_API_KEY;
const API_BASE_URL = 'https://api.agent-a.asleep.ai';

// Validate required environment variables
if (!AST_ID || !AST_API_KEY) {
  console.error('Error: AST_ID and AST_API_KEY environment variables are required');
  process.exit(1);
}

// Create API client for Asleep.ai
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': AST_API_KEY,
    'x-ast-id': AST_ID
  }
});

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

// Deep Insight tool for sleep analysis
registerTool({
  name: 'deep_insight',
  description: 'Analyzes sleep data and provides insights',
  schema: {},
  handler: async (params) => {
    try {
      // Log request for debugging
      if (LOG_LEVEL === 'debug') {
        console.log('Sending deep_insight request with params:', params);
      }

      // Prepare request payload
      const payload = {
        data: {
          type: "deep_insight"
        }
      };

      // Send request to the Asleep.ai API
      const response = await apiClient.post('/v1/responses', payload);
      
      // Return the response data
      return response.data;
    } catch (error) {
      // Handle errors
      console.error('Error in deep_insight tool:', error);
      
      if (axios.isAxiosError(error)) {
        return {
          error: true,
          message: error.message,
          status: error.response?.status,
          details: error.response?.data
        };
      }
      
      return {
        error: true,
        message: 'An unexpected error occurred during sleep analysis'
      };
    }
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