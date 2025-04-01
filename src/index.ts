import express from 'express';
import { z } from 'zod';

// Basic server configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Tool registry
interface Tool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  handler: (params: any) => Promise<any>;
}

const tools: Record<string, Tool> = {};

// Register a tool
function registerTool(tool: Tool) {
  tools[tool.name] = tool;
  console.log(`Tool registered: ${tool.name}`);
}

// Setup Express server
const app = express();
app.use(express.json());

// MCP endpoints
app.post('/invoke', async (req, res) => {
  try {
    const { tool, params } = req.body;
    
    if (!tool || !tools[tool]) {
      return res.status(404).json({ error: `Tool '${tool}' not found` });
    }
    
    const selectedTool = tools[tool];
    const validationResult = selectedTool.schema.safeParse(params);
    
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid parameters', details: validationResult.error });
    }
    
    const result = await selectedTool.handler(params);
    return res.json({ result });
  } catch (error) {
    console.error('Error invoking tool:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/tools', (req, res) => {
  const toolsList = Object.values(tools).map(tool => ({
    name: tool.name,
    description: tool.description,
    schema: tool.schema.shape
  }));
  
  res.json({ tools: toolsList });
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT} with log level ${LOG_LEVEL}`);
});

// Example tool registration
registerTool({
  name: 'echo',
  description: 'Echoes back the input message',
  schema: z.object({
    message: z.string().describe('The message to echo back')
  }),
  handler: async (params) => {
    return { message: params.message };
  }
});

export { registerTool };