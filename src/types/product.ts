/**
 * A purchasable Instamart product variant (e.g. one pack size of an item).
 * Instamart's real search_products response schema isn't publicly documented — this is
 * populated defensively by mcp/instamart/normalize.ts, not parsed directly from raw JSON
 * elsewhere in the app. spinId is the only ID the update_cart tool accepts.
 */
export interface ProductVariant {
  spinId: string;
  name: string;
  price: number;
  /** e.g. "750 ml", "28 g x 3" — display-only, not used in any tool call. */
  quantityLabel?: string;
  imageUrl?: string;
  inStock?: boolean;
}
