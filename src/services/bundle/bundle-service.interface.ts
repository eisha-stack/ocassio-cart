import type { Occasion } from '@/types/occasion';
import type { Product } from '@/types/product';

/**
 * TODO: define the bundle generation contract (occasion -> recommended products).
 */
export interface IBundleService {
  generateBundle(occasion: Occasion): Promise<Product[]>;
}
