import type { CartItemInput, ICartService } from './cart-service.interface';
import type { CartSnapshot } from '@/types/cart';
import type { IInstamartAdapter } from '@/mcp/instamart/instamart-adapter.interface';
import { AppError } from '@/utils/errors';

export class CartService implements ICartService {
  constructor(private readonly instamartAdapter: IInstamartAdapter) {}

  async getCart(): Promise<CartSnapshot> {
    return this.instamartAdapter.getCart();
  }

  async setItemQuantity(item: CartItemInput, addressId?: string): Promise<CartSnapshot> {
    const resolvedAddressId = addressId ?? (await this.resolveDefaultAddressId());
    const current = await this.instamartAdapter.getCart();

    // update_cart replaces the entire cart, so merge the requested change into the current
    // item list rather than sending only the delta.
    const merged = current.items
      .filter((existing) => existing.spinId !== item.spinId)
      .map((existing) => ({ spinId: existing.spinId, quantity: existing.quantity }));

    if (item.quantity > 0) {
      merged.push({ spinId: item.spinId, quantity: item.quantity });
    }

    return this.instamartAdapter.updateCart(resolvedAddressId, merged);
  }

  async removeItem(spinId: string, addressId?: string): Promise<CartSnapshot> {
    return this.setItemQuantity({ spinId, quantity: 0 }, addressId);
  }

  async clearCart(): Promise<CartSnapshot> {
    return this.instamartAdapter.clearCart();
  }

  private async resolveDefaultAddressId(): Promise<string> {
    const addresses = await this.instamartAdapter.getAddresses();
    const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

    if (!defaultAddress) {
      throw new AppError('No saved Instamart delivery address found.');
    }

    return defaultAddress.id;
  }
}
