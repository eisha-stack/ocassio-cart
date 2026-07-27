/**
 * Application-wide constants that are not environment-specific.
 * TODO: populate with real values once business requirements are defined
 * (e.g. supported occasions, default bundle sizes, MCP call timeouts).
 */

export const APP_NAME = 'OccasioCart';

/**
 * MCP tools that must never be auto-executed by the LLM — the orchestrator intercepts
 * calls to these and returns `requiresConfirmation`/`pendingAction` instead, only running
 * them once the user has explicitly confirmed outside the model's control.
 *
 * "confirm_order" is included alongside "checkout" because the live Instamart MCP server
 * exposes it as a distinct order-finalizing tool not mentioned in the public docs — found by
 * diffing mcpClient.listTools() output against https://mcp.swiggy.com/builders/docs/reference/instamart/.
 * Any tool that can finalize a real order/payment belongs here.
 */
export const GATED_MCP_TOOLS = ['checkout', 'confirm_order'] as const;

// A real bundle flow (get_addresses + your_go_to_items + one search_products per item +
// update_cart + get_cart) easily exceeds 8 when the model calls a single tool per turn
// rather than batching several — observed hitting the old cap of 8 mid-search, before ever
// reaching update_cart.
export const MAX_TOOL_CALL_ITERATIONS = 20;

/**
 * Caps on what gets sent to the model per request, to keep a single completion
 * call from blowing past small-provider TPM limits (e.g. Groq's free tier, observed
 * at 6,000 TPM for llama-3.1-8b-instant) — tool schemas, unbounded conversation
 * history, and raw tool *results* (e.g. a full search_products payload) are the
 * three things that grow a request the most.
 */
export const MAX_TOOL_DESCRIPTION_LENGTH = 150;
export const MAX_HISTORY_TURNS = 3;
export const MAX_TOOL_RESULT_LENGTH = 1500;
