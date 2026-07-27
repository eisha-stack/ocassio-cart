import type { IBundleService } from './bundle-service.interface';
import type { Occasion } from '@/types/occasion';
import type { Product } from '@/types/product';

/**
 * TODO: implement bundle generation, likely delegating to an AI agent + Instamart adapter.
 */
export class BundleService implements IBundleService {
  async generateBundle(_occasion: Occasion): Promise<Product[]> {
    throw new Error('Not implemented');
  }
}
