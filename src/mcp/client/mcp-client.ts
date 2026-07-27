import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { IMcpClient } from './mcp-client.interface';
import type {
  McpToolCallRequest,
  McpToolCallResponse,
  McpToolDefinition,
} from '../types/mcp.types';
import { appConfig } from '@/config/app-config';

const MCP_CLIENT_NAME = 'occasiocart';
const MCP_CLIENT_VERSION = '0.1.0';

/**
 * Thin wrapper around @modelcontextprotocol/sdk's Client, pointed at Swiggy Instamart's
 * Streamable HTTP MCP endpoint. Not a singleton: instantiate one per request/session,
 * since each connection is bound to one user's OAuth access token.
 */
export class McpClient implements IMcpClient {
  private client: Client | null = null;

  async connect(accessToken: string): Promise<void> {
    const transport = new StreamableHTTPClientTransport(new URL(appConfig.instamart.mcpServerUrl), {
      requestInit: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });

    const client = new Client(
      { name: MCP_CLIENT_NAME, version: MCP_CLIENT_VERSION },
      { capabilities: {} },
    );
    await client.connect(transport);
    this.client = client;
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
    this.client = null;
  }

  async listTools(): Promise<McpToolDefinition[]> {
    const { tools } = await this.requireClient().listTools();
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool<T = unknown>(request: McpToolCallRequest): Promise<McpToolCallResponse<T>> {
    const result = await this.requireClient().callTool({
      name: request.tool,
      arguments: request.input,
    });

    return {
      success: !result.isError,
      data: result as unknown as T,
    };
  }

  private requireClient(): Client {
    if (!this.client) {
      throw new Error('MCP client is not connected. Call connect(accessToken) first.');
    }
    return this.client;
  }
}
