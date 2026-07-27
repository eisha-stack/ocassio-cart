/**
 * A single cart line item, normalized from Instamart's get_cart/update_cart response
 * (see mcp/instamart/normalize.ts — the real response schema isn't publicly documented).
 */
export interface CartLineItem {
  spinId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

/** Ground-truth cart state as last reported by Instamart itself — never author this from LLM prose. */
export interface CartSnapshot {
  items: CartLineItem[];
  total: number;
  availablePaymentMethods?: string[];
  /** Set when normalization couldn't confidently parse the raw response (unknown/changed schema). */
  raw?: unknown;
}
