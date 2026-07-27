import type { ITokenStore, InstamartTokenSet } from './token-store.interface';

/**
 * In-memory token store, keyed by our own app session id (see oauth-cookies.ts).
 *
 * TODO: replace with a persistent, shared store (DB/Redis) before production —
 * tokens are lost on server restart and won't be visible across multiple instances.
 */
export class InMemoryTokenStore implements ITokenStore {
  private readonly tokens = new Map<string, InstamartTokenSet>();

  async getToken(sessionId: string): Promise<InstamartTokenSet | undefined> {
    return this.tokens.get(sessionId);
  }

  async saveToken(sessionId: string, tokenSet: InstamartTokenSet): Promise<void> {
    this.tokens.set(sessionId, tokenSet);
  }

  async deleteToken(sessionId: string): Promise<void> {
    this.tokens.delete(sessionId);
  }
}

// Pinned to globalThis so Next.js dev-mode hot-reload (which re-executes changed modules)
// doesn't silently recreate an empty store out from under active sessions. Doesn't help
// across a real process restart — that still needs the persistent store from the TODO above.
const globalForTokenStore = globalThis as unknown as { __instamartTokenStore?: ITokenStore };

export const tokenStore: ITokenStore =
  globalForTokenStore.__instamartTokenStore ?? new InMemoryTokenStore();

globalForTokenStore.__instamartTokenStore = tokenStore;
