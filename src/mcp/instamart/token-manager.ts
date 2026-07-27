import { appConfig } from '@/config/app-config';
import { logger } from '@/utils/logger';
import { tokenStore } from './token-store';

const REFRESH_BUFFER_MS = 60_000;

interface InstamartTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/**
 * Returns a currently-valid Instamart access token for the given app session,
 * transparently refreshing it if it's within a minute of expiry. Returns undefined
 * if there's no token or refresh fails — callers should redirect the user to
 * /api/instamart/auth/login in that case (docs: "always treat 401 as re-run authorization").
 */
export async function getValidAccessToken(sessionId: string): Promise<string | undefined> {
  const tokenSet = await tokenStore.getToken(sessionId);
  if (!tokenSet) {
    return undefined;
  }

  if (tokenSet.expiresAt - Date.now() > REFRESH_BUFFER_MS) {
    return tokenSet.accessToken;
  }

  if (!tokenSet.refreshToken) {
    return undefined;
  }

  const { oauth } = appConfig.instamart;
  const response = await fetch(oauth.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenSet.refreshToken,
      client_id: oauth.clientId,
    }),
  });

  if (!response.ok) {
    logger.warn('Instamart token refresh failed', { status: response.status });
    return undefined;
  }

  const data = (await response.json()) as InstamartTokenResponse;

  await tokenStore.saveToken(sessionId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokenSet.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}
