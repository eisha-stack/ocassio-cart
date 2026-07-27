import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { appConfig } from '@/config/app-config';
import { tokenStore } from '@/mcp/instamart/token-store';
import {
  OAUTH_STATE_COOKIE_NAME,
  PKCE_VERIFIER_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from '@/mcp/instamart/oauth-cookies';
import { logger } from '@/utils/logger';

interface InstamartTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchanges the Instamart authorization code for tokens (PKCE) and stores them
 * against this browser's app session, keyed in tokenStore by a session id cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return NextResponse.json({ error: oauthError }, { status: 400 });
  }

  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;
  const codeVerifier = request.cookies.get(PKCE_VERIFIER_COOKIE_NAME)?.value;

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    return NextResponse.json({ error: 'Invalid or missing OAuth state/code' }, { status: 400 });
  }

  const { oauth } = appConfig.instamart;

  const tokenRes = await fetch(oauth.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauth.redirectUri,
      client_id: oauth.clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    logger.error('Instamart token exchange failed', { status: tokenRes.status });
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 502 });
  }

  const tokenData = (await tokenRes.json()) as InstamartTokenResponse;
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? randomUUID();

  await tokenStore.saveToken(sessionId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  });

  const response = NextResponse.redirect(new URL('/', request.url));

  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
  response.cookies.delete(PKCE_VERIFIER_COOKIE_NAME);
  response.cookies.delete(OAUTH_STATE_COOKIE_NAME);

  return response;
}
