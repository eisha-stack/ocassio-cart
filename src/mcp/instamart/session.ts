import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './oauth-cookies';
import { getValidAccessToken } from './token-manager';

/**
 * Resolves the app session cookie into a currently-valid Instamart access token, or null if
 * the user isn't authenticated / their session expired. Callers should 401 and point the user
 * at /api/instamart/auth/login in that case.
 */
export async function getSessionAndAccessToken(
  request: NextRequest,
): Promise<{ sessionId: string; accessToken: string } | null> {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const accessToken = await getValidAccessToken(sessionId);
  if (!accessToken) return null;

  return { sessionId, accessToken };
}
