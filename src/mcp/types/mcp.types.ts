/**
 * Request/response shapes for calling a Swiggy Instamart MCP tool.
 */
export interface McpToolCallRequest {
  tool: string;
  input: Record<string, unknown>;
}

export interface McpToolCallResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * A tool as advertised by the MCP server's `listTools` response, trimmed to the
 * fields we actually need (JSON-Schema `inputSchema` maps directly onto OpenAI's
 * function-calling `parameters` field — see src/lib/openai/tool-bridge.ts).
 */
export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}
