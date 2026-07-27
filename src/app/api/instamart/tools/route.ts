import { NextRequest, NextResponse } from 'next/server';
import { McpClient } from '@/mcp/client/mcp-client';
import { SESSION_COOKIE_NAME } from '@/mcp/instamart/oauth-cookies';
import { getValidAccessToken } from '@/mcp/instamart/token-manager';

/**
 * Connects to the Swiggy Instamart MCP server as the current session's authenticated
 * user and lists every tool it exposes. Requires having completed
 * /api/instamart/auth/login first.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Not authenticated. Visit /api/instamart/auth/login first.' },
      { status: 401 },
    );
  }

  const accessToken = await getValidAccessToken(sessionId);

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Instamart session expired or missing. Visit /api/instamart/auth/login again.' },
      { status: 401 },
    );
  }

  const mcpClient = new McpClient();

  try {
    await mcpClient.connect(accessToken);
    const tools = await mcpClient.listTools();
    return NextResponse.json({ tools });
  } finally {
    await mcpClient.disconnect();
  }
}
