import type { Occasion } from '@/types/occasion';
import type { ProductVariant } from '@/types/product';

/**
 * TODO: define the bundle generation contract (occasion -> recommended products).
 */
export interface IBundleService {
  generateBundle(occasion: Occasion): Promise<ProductVariant[]>;
}
