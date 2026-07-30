import type { CartSnapshot } from './cart';
import type { ProductVariant } from './product';

/**
 * Shared contracts between AI orchestration layers.
 * TODO: refine once the orchestration flow (occasion -> bundle -> cart -> order) is implemented.
 */
export interface AgentRequest {
  /** App session id (see mcp/instamart/oauth-cookies.ts) — not yet a real end-user account id. */
  userId: string;
  message: string;
  /** The session's current Instamart OAuth access token (src/mcp/instamart/token-manager.ts). */
  instamartAccessToken: string;
  /** Present when the user is confirming a previously-proposed gated action (e.g. checkout). */
  confirmedAction?: PendingToolAction;
}

export interface PendingToolAction {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface AgentResponse {
  message: string;
  requiresConfirmation?: boolean;
  /** Present when the model wants to run a gated tool (e.g. checkout) awaiting user confirmation. */
  pendingAction?: PendingToolAction;
  /**
   * Ground-truth cart state, present whenever this turn called get_cart/update_cart — normalized
   * directly from Instamart's own response, not transcribed from the model's text. The UI must
   * render prices/quantities from here, never from `message`, since the model has been observed
   * misstating exact figures (e.g. quoting a price the tool result didn't return).
   */
  cart?: CartSnapshot;
  /** Ground-truth product options, present whenever this turn called search_products. */
  products?: ProductVariant[];
  /** Optional quick-reply suggestions to show as chips under this message. */
  suggestions?: string[];
}
