import type { Product } from '@/types/product';
import type { Cart } from '@/types/cart';
import type { Order } from '@/types/order';

/**
 * Domain-specific contract for interacting with Swiggy Instamart via MCP.
 * TODO: implement search/cart/order operations by delegating to IMcpClient.
 */
export interface IInstamartAdapter {
  searchProducts(query: string): Promise<Product[]>;
  addToCart(cartId: string, productId: string, quantity: number): Promise<Cart>;
  placeOrder(cartId: string): Promise<Order>;
}
