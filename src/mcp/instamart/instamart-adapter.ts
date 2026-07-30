import type { IInstamartAdapter } from './instamart-adapter.interface';
import type { IMcpClient } from '../client/mcp-client.interface';
import type { ProductVariant } from '@/types/product';
import type { CartSnapshot } from '@/types/cart';
import type { AddressSummary } from '@/types/address';
import { normalizeAddresses, normalizeCart, normalizeProducts } from './normalize';
import { McpCommunicationError } from '@/utils/errors';

const EMPTY_CART: CartSnapshot = { items: [], total: 0 };

/**
 * Real Instamart adapter — calls the live MCP tools via an already-connected IMcpClient (the
 * caller is responsible for connect()/disconnect(), same pattern as AgentOrchestrator) and
 * normalizes responses (see normalize.ts — the real response schema isn't publicly documented,
 * so normalization is best-effort/defensive rather than a strict parse).
 */
export class InstamartAdapter implements IInstamartAdapter {
  constructor(private readonly mcpClient: IMcpClient) {}

  async getAddresses(): Promise<AddressSummary[]> {
    const result = await this.mcpClient.callTool({ tool: 'get_addresses', input: {} });
    this.assertSuccess(result.success, 'get_addresses', result.data);
    return normalizeAddresses(result.data);
  }

  async searchProducts(addressId: string, query: string): Promise<ProductVariant[]> {
    const result = await this.mcpClient.callTool({
      tool: 'search_products',
      input: { addressId, query },
    });
    this.assertSuccess(result.success, 'search_products', result.data);
    return normalizeProducts(result.data);
  }

  async getCart(): Promise<CartSnapshot> {
    const result = await this.mcpClient.callTool({ tool: 'get_cart', input: {} });
    this.assertSuccess(result.success, 'get_cart', result.data);
    return normalizeCart(result.data) ?? EMPTY_CART;
  }

  async updateCart(
    addressId: string,
    items: { spinId: string; quantity: number }[],
  ): Promise<CartSnapshot> {
    const result = await this.mcpClient.callTool({
      tool: 'update_cart',
      input: { selectedAddressId: addressId, items },
    });
    this.assertSuccess(result.success, 'update_cart', result.data);
    return normalizeCart(result.data) ?? EMPTY_CART;
  }

  async clearCart(): Promise<CartSnapshot> {
    const result = await this.mcpClient.callTool({ tool: 'clear_cart', input: {} });
    this.assertSuccess(result.success, 'clear_cart', result.data);
    return normalizeCart(result.data) ?? EMPTY_CART;
  }

  private assertSuccess(success: boolean, tool: string, data: unknown): void {
    if (!success) {
      throw new McpCommunicationError(`Instamart tool "${tool}" failed`, data);
    }
  }
}
