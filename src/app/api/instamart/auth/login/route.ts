import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { appConfig } from '@/config/app-config';
import { generatePkcePair } from '@/mcp/instamart/pkce';
import {
  OAUTH_STATE_COOKIE_NAME,
  PKCE_COOKIE_MAX_AGE_SECONDS,
  PKCE_VERIFIER_COOKIE_NAME,
} from '@/mcp/instamart/oauth-cookies';

/**
 * Starts the Instamart OAuth 2.1 + PKCE login flow. The user authenticates against their
 * real Swiggy account via phone number + OTP on Swiggy's own authorize page.
 */
export async function GET() {
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = randomBytes(16).toString('hex');

  const { oauth } = appConfig.instamart;
  const authorizeUrl = new URL(oauth.authUrl);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', oauth.clientId);
  authorizeUrl.searchParams.set('redirect_uri', oauth.redirectUri);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('scope', oauth.scope);
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: PKCE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  };

  response.cookies.set(PKCE_VERIFIER_COOKIE_NAME, codeVerifier, cookieOptions);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, cookieOptions);

  return response;
}
