import type { Order } from '@/types/order';

/**
 * TODO: define order placement contract, including the explicit user-confirmation step.
 */
export interface IOrderService {
  confirmAndPlaceOrder(cartId: string): Promise<Order>;
}
