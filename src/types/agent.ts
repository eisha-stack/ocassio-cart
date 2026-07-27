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
}
