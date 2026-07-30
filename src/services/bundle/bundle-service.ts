import type { IBundleService } from './bundle-service.interface';
import type { Occasion } from '@/types/occasion';
import type { ProductVariant } from '@/types/product';

/**
 * TODO: implement bundle generation, likely delegating to an AI agent + Instamart adapter.
 */
export class BundleService implements IBundleService {
  async generateBundle(_occasion: Occasion): Promise<ProductVariant[]> {
    throw new Error('Not implemented');
  }
}
