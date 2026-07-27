/**
 * Cookie names used by the Instamart OAuth flow (src/app/api/instamart/auth/*).
 */
export const SESSION_COOKIE_NAME = 'occasiocart_session';
export const PKCE_VERIFIER_COOKIE_NAME = 'im_pkce_verifier';
export const OAUTH_STATE_COOKIE_NAME = 'im_oauth_state';

/** Matches Swiggy's documented access token lifetime. */
export const PKCE_COOKIE_MAX_AGE_SECONDS = 600;
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
