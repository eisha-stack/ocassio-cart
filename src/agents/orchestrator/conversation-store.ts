import type OpenAI from 'openai';

export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface PendingGatedCall {
  toolCallId: string;
  tool: string;
  arguments: Record<string, unknown>;
}

/**
 * Per-session chat history and gated-tool-call state, keyed by app session id.
 *
 * TODO: replace with a persistent store (DB/Redis) before production — same caveat as
 * mcp/instamart/token-store.ts: in-memory state is lost on restart and isn't shared
 * across instances.
 */
class InMemoryConversationStore {
  private readonly histories = new Map<string, ChatMessage[]>();
  private readonly pendingActions = new Map<string, PendingGatedCall>();

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    return this.histories.get(sessionId) ?? [];
  }

  async appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    const existing = this.histories.get(sessionId) ?? [];
    this.histories.set(sessionId, [...existing, ...messages]);
  }

  getPendingAction(sessionId: string): PendingGatedCall | undefined {
    return this.pendingActions.get(sessionId);
  }

  setPendingAction(sessionId: string, pending: PendingGatedCall): void {
    this.pendingActions.set(sessionId, pending);
  }

  clearPendingAction(sessionId: string): void {
    this.pendingActions.delete(sessionId);
  }
}

// Pinned to globalThis so Next.js dev-mode hot-reload doesn't recreate an empty store
// out from under an in-progress conversation — see token-store.ts for the same pattern.
const globalForConversationStore = globalThis as unknown as {
  __occasioCartConversationStore?: InMemoryConversationStore;
};

export const conversationStore: InMemoryConversationStore =
  globalForConversationStore.__occasioCartConversationStore ?? new InMemoryConversationStore();

globalForConversationStore.__occasioCartConversationStore = conversationStore;
