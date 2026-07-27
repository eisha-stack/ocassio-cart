import type { Cart } from '@/types/cart';

/**
 * TODO: define cart business logic contract (create, update, validate).
 */
export interface ICartService {
  createCart(): Promise<Cart>;
  addItem(cartId: string, productId: string, quantity: number): Promise<Cart>;
  getCart(cartId: string): Promise<Cart>;
}
