import type {
  McpToolCallRequest,
  McpToolCallResponse,
  McpToolDefinition,
} from '../types/mcp.types';

/**
 * Generic contract for communicating with an MCP server. Instamart uses per-user
 * OAuth (see token-manager.ts) so the access token is supplied at connect() time
 * rather than baked into a shared singleton.
 */
export interface IMcpClient {
  connect(accessToken: string): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<McpToolDefinition[]>;
  callTool<T = unknown>(request: McpToolCallRequest): Promise<McpToolCallResponse<T>>;
}
