import type { IOrderService } from './order-service.interface';
import type { Order } from '@/types/order';
import type { IInstamartAdapter } from '@/mcp/instamart/instamart-adapter.interface';

/**
 * TODO: implement order placement. Must only call IInstamartAdapter.placeOrder after
 * explicit user confirmation has been captured by the orchestration layer.
 */
export class OrderService implements IOrderService {
  constructor(private readonly instamartAdapter: IInstamartAdapter) {}

  async confirmAndPlaceOrder(_cartId: string): Promise<Order> {
    throw new Error('Not implemented');
  }
}
