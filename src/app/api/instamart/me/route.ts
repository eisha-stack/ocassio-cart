import { NextRequest, NextResponse } from 'next/server';
import { McpClient } from '@/mcp/client/mcp-client';
import { InstamartAdapter } from '@/mcp/instamart/instamart-adapter';
import { getSessionAndAccessToken } from '@/mcp/instamart/session';
import { logger } from '@/utils/logger';

/**
 * Lightweight profile lookup for the chat's opening greeting — Instamart has no dedicated
 * "get profile" tool, so this best-effort reads the saved delivery addresses and uses the
 * default (or first) address's userName, if any.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionAndAccessToken(request);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const mcpClient = new McpClient();
  await mcpClient.connect(session.accessToken);

  try {
    const addresses = await new InstamartAdapter(mcpClient).getAddresses();
    const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

    return NextResponse.json({
      authenticated: true,
      name: defaultAddress?.userName,
      addresses,
    });
  } catch (error) {
    logger.error('Failed to load Instamart profile', { error });
    return NextResponse.json({ authenticated: true, name: undefined, addresses: [] });
  } finally {
    await mcpClient.disconnect();
  }
}
