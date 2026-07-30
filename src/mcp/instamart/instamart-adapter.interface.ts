import type { ProductVariant } from '@/types/product';
import type { CartSnapshot } from '@/types/cart';
import type { AddressSummary } from '@/types/address';

/**
 * Domain-specific contract for interacting with Swiggy Instamart via MCP. Shaped around
 * Instamart's real concepts (addressId + spinId) rather than a generic cartId/productId model,
 * since update_cart replaces the entire cart by spinId and has no separate cart identifier.
 */
export interface IInstamartAdapter {
  getAddresses(): Promise<AddressSummary[]>;
  searchProducts(addressId: string, query: string): Promise<ProductVariant[]>;
  getCart(): Promise<CartSnapshot>;
  /** Replaces the entire cart with these items (Instamart's update_cart semantics). */
  updateCart(addressId: string, items: { spinId: string; quantity: number }[]): Promise<CartSnapshot>;
  clearCart(): Promise<CartSnapshot>;
}
