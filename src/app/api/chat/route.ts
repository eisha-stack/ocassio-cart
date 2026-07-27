import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { container } from '@/lib/container';
import { SESSION_COOKIE_NAME } from '@/mcp/instamart/oauth-cookies';
import { getValidAccessToken } from '@/mcp/instamart/token-manager';
import { logger } from '@/utils/logger';

const chatRequestSchema = z.object({
  message: z.string().min(1).optional(),
  confirmedAction: z
    .object({
      tool: z.string(),
      arguments: z.record(z.unknown()),
    })
    .optional(),
});

/**
 * Single chat turn: requires an authenticated Instamart session (see
 * /api/instamart/auth/login). Delegates to container.agentOrchestrator, which drives
 * the OpenAI + MCP tool-calling loop and gates checkout behind explicit confirmation.
 */
export async function POST(request: NextRequest) {
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

  const parsed = chatRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.message && !parsed.data.confirmedAction) {
    return NextResponse.json(
      { error: 'Either "message" or "confirmedAction" is required.' },
      { status: 400 },
    );
  }

  try {
    const response = await container.agentOrchestrator.handleMessage({
      userId: sessionId,
      message: parsed.data.message ?? '',
      confirmedAction: parsed.data.confirmedAction,
      instamartAccessToken: accessToken,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      logger.error('OpenAI API error', { status: error.status, message: error.message });
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status ?? 502 },
      );
    }

    logger.error('Chat request failed', { error });
    return NextResponse.json({ error: 'Something went wrong handling the message.' }, { status: 500 });
  }
}
