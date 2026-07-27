/**
 * Instamart is accessed via per-user delegated OAuth (phone/OTP login against a real
 * Swiggy account) — there is no single service-level credential. Every session that
 * wants to call Instamart tools needs its own stored token set.
 */
export interface InstamartTokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds when accessToken expires. */
  expiresAt: number;
}

export interface ITokenStore {
  getToken(sessionId: string): Promise<InstamartTokenSet | undefined>;
  saveToken(sessionId: string, tokenSet: InstamartTokenSet): Promise<void>;
  deleteToken(sessionId: string): Promise<void>;
}
