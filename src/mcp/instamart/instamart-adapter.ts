import type { IInstamartAdapter } from './instamart-adapter.interface';
import type { IMcpClient } from '../client/mcp-client.interface';
import type { Product } from '@/types/product';
import type { Cart } from '@/types/cart';
import type { Order } from '@/types/order';

/**
 * Placeholder Instamart adapter.
 * TODO: implement each method by calling the appropriate Instamart MCP tool via IMcpClient.
 */
export class InstamartAdapter implements IInstamartAdapter {
  constructor(private readonly mcpClient: IMcpClient) {}

  async searchProducts(_query: string): Promise<Product[]> {
    throw new Error('Not implemented');
  }

  async addToCart(_cartId: string, _productId: string, _quantity: number): Promise<Cart> {
    throw new Error('Not implemented');
  }

  async placeOrder(_cartId: string): Promise<Order> {
    throw new Error('Not implemented');
  }
}
