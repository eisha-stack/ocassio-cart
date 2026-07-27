/**
 * TODO: define the full order lifecycle and confirmation metadata.
 */
export interface Order {
  id: string;
  cartId: string;
  status: 'pending' | 'confirmed' | 'placed' | 'failed';
}
