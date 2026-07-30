import type { CartSnapshot } from '@/types/cart';

export interface CartItemInput {
  spinId: string;
  quantity: number;
}

/**
 * Cart business logic. addressId is optional on writes — when omitted, the service resolves
 * the user's default (or first) saved Instamart address itself.
 */
export interface ICartService {
  getCart(): Promise<CartSnapshot>;
  /** Sets an item to an exact quantity (0 removes it) — merges with the existing cart, since
   *  Instamart's update_cart tool replaces the entire cart rather than patching one item. */
  setItemQuantity(item: CartItemInput, addressId?: string): Promise<CartSnapshot>;
  removeItem(spinId: string, addressId?: string): Promise<CartSnapshot>;
  clearCart(): Promise<CartSnapshot>;
}
