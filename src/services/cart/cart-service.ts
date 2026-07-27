import type { ICartService } from './cart-service.interface';
import type { Cart } from '@/types/cart';
import type { IInstamartAdapter } from '@/mcp/instamart/instamart-adapter.interface';

/**
 * TODO: implement cart business logic, delegating persistence/MCP calls to IInstamartAdapter.
 */
export class CartService implements ICartService {
  constructor(private readonly instamartAdapter: IInstamartAdapter) {}

  async createCart(): Promise<Cart> {
    throw new Error('Not implemented');
  }

  async addItem(_cartId: string, _productId: string, _quantity: number): Promise<Cart> {
    throw new Error('Not implemented');
  }

  async getCart(_cartId: string): Promise<Cart> {
    throw new Error('Not implemented');
  }
}
