import type { CartSnapshot, CartLineItem } from '@/types/cart';
import type { ProductVariant } from '@/types/product';
import type { AddressSummary } from '@/types/address';
import { logger } from '@/utils/logger';

/**
 * Instamart's real get_cart/search_products/get_addresses response schemas are not publicly
 * documented (https://mcp.swiggy.com/builders/docs/reference/instamart/ only shows the generic
 * {success, data, message} envelope, not what's inside `data`). These normalizers are
 * deliberately defensive: they try several plausible field-name variants for each concept
 * (price, quantity, spinId, ...) instead of assuming one exact shape, and fail soft — returning
 * `null`/an empty list rather than throwing — so an unexpected shape shows up as "couldn't load
 * cart details" in the UI instead of crashing the chat turn.
 *
 * TODO: once a real response has been inspected, replace the field-name guessing below with the
 * confirmed shape.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstDefined(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Confirmed from a real get_cart response: cartTotalAmount comes back as "₹236", a
    // currency-symbol-prefixed string, not a plain number — strip anything that isn't part
    // of a number before parsing.
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (cleaned !== '' && !Number.isNaN(Number(cleaned))) return Number(cleaned);
  }
  return undefined;
}

function firstArray(obj: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return [];
}

/** Unwraps Swiggy's documented {success, data, message} envelope if present, else passes through. */
function unwrapEnvelope(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) {
    logger.warn('[diagnostic] unwrapEnvelope: raw payload was not an object', { raw });
    return null;
  }
  if (record.success === false) return null;
  const inner = asRecord(record.data);
  return inner ?? record;
}

const CART_ITEM_KEYS = ['items', 'cartItems', 'lineItems', 'products'];
// Confirmed from a real get_cart response — spinId/itemName/discountedFinalPrice/mrp are real
// Instamart field names, not guesses (see git history for the earlier guessed-only list).
const SPIN_ID_KEYS = ['spinId', 'variantId', 'skuId', 'id'];
const NAME_KEYS = ['itemName', 'displayName', 'name', 'productName', 'title'];
const PRICE_KEYS = [
  'discountedFinalPrice',
  'sellingPrice',
  'finalPrice',
  'price',
  'unitPrice',
  'itemPrice',
  'mrp',
];
const QUANTITY_KEYS = ['quantity', 'qty', 'count'];
const IMAGE_KEYS = ['imageUrl', 'image', 'imageUrl1', 'thumbnail'];
const TOTAL_KEYS = [
  'cartTotalAmount',
  'total',
  'cartTotal',
  'billTotal',
  'grandTotal',
  'amountToPay',
  'payableAmount',
];
const PAYMENT_METHOD_KEYS = ['availablePaymentMethods', 'paymentMethods', 'paymentOptions'];
const MRP_KEYS = ['mrp', 'originalPrice', 'listPrice'];
const ADDRESS_ID_IN_CART_KEYS = ['selectedAddress', 'addressId', 'selectedAddressId'];
const NESTED_OFFER_PRICE_KEYS = ['offerPrice', 'sellingPrice', 'finalPrice'];

/**
 * get_cart items have flat price fields (discountedFinalPrice/mrp directly on the item), but
 * search_products variants nest them under a "price" object instead:
 * { price: { mrp, offerPrice, unitLevelPrice } } — confirmed from a real response. Try the
 * nested shape first since a flat PRICE_KEYS/MRP_KEYS lookup on a search_products variant would
 * otherwise grab the whole {mrp, offerPrice, ...} object and fail to convert it to a number.
 */
function extractPrice(item: Record<string, unknown>): { price?: number; mrp?: number } {
  const nested = asRecord(item.price);
  if (nested) {
    const offerPrice = asNumber(firstDefined(nested, NESTED_OFFER_PRICE_KEYS));
    const mrp = asNumber(firstDefined(nested, MRP_KEYS));
    return { price: offerPrice ?? mrp, mrp };
  }

  return {
    price: asNumber(firstDefined(item, PRICE_KEYS)),
    mrp: asNumber(firstDefined(item, MRP_KEYS)),
  };
}

export function normalizeCart(raw: unknown): CartSnapshot | null {
  const data = unwrapEnvelope(raw);
  if (!data) return null;

  const rawItems = firstArray(data, CART_ITEM_KEYS);
  const items: CartLineItem[] = [];

  for (const entry of rawItems) {
    const item = asRecord(entry);
    if (!item) continue;

    const spinId = asString(firstDefined(item, SPIN_ID_KEYS));
    const name = asString(firstDefined(item, NAME_KEYS));
    const { price, mrp } = extractPrice(item);
    const quantity = asNumber(firstDefined(item, QUANTITY_KEYS));

    if (!spinId || !name || price === undefined || quantity === undefined) continue;

    items.push({
      spinId,
      name,
      price,
      mrp: mrp !== undefined && mrp > price ? mrp : undefined,
      quantity,
      imageUrl: asString(firstDefined(item, IMAGE_KEYS)),
    });
  }

  if (items.length === 0 && rawItems.length > 0) {
    // Found an items array but couldn't parse any entry — the shape doesn't match our
    // guesses. Log the real shape so the field-name lists above can be corrected, and
    // surface the raw payload rather than silently showing an empty cart.
    logger.warn('[diagnostic] normalizeCart: found an items array but could not parse an entry', {
      topLevelKeys: Object.keys(data),
      sampleItem: rawItems[0],
    });
    return { items: [], total: 0, raw };
  }

  const total =
    asNumber(firstDefined(data, TOTAL_KEYS)) ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const paymentMethodsRaw = firstArray(data, PAYMENT_METHOD_KEYS);
  const availablePaymentMethods = paymentMethodsRaw
    .map((m) => asString(m) ?? asString(asRecord(m)?.name))
    .filter((m): m is string => !!m);

  return {
    items,
    total,
    addressId: asString(firstDefined(data, ADDRESS_ID_IN_CART_KEYS)),
    availablePaymentMethods: availablePaymentMethods.length > 0 ? availablePaymentMethods : undefined,
  };
}

const PRODUCT_LIST_KEYS = ['products', 'items', 'results'];
// Confirmed from a real search_products response — displayName/variations/isAvail are real
// Instamart field names, not guesses.
const VARIANT_LIST_KEYS = ['variations', 'variants', 'skus', 'options'];
const QUANTITY_LABEL_KEYS = ['quantityDescription', 'quantityLabel', 'packSize', 'unit', 'weight'];
const STOCK_KEYS = ['isInStockAndAvailable', 'isAvail', 'inStock', 'available', 'isAvailable'];

export function normalizeProducts(raw: unknown): ProductVariant[] {
  const data = unwrapEnvelope(raw);
  if (!data) return [];

  const rawProducts = firstArray(data, PRODUCT_LIST_KEYS);
  const variants: ProductVariant[] = [];

  for (const entry of rawProducts) {
    const product = asRecord(entry);
    if (!product) continue;

    const productName = asString(firstDefined(product, NAME_KEYS));
    const productImage = asString(firstDefined(product, IMAGE_KEYS));
    const rawVariants = firstArray(product, VARIANT_LIST_KEYS);

    // Some shapes nest variants under the product; others are already a flat variant list.
    const variantEntries = rawVariants.length > 0 ? rawVariants : [product];

    for (const variantEntry of variantEntries) {
      const variant = asRecord(variantEntry);
      if (!variant) continue;

      const spinId = asString(firstDefined(variant, SPIN_ID_KEYS));
      const { price, mrp } = extractPrice(variant);
      const name = asString(firstDefined(variant, NAME_KEYS)) ?? productName;

      if (!spinId || price === undefined || !name) continue;

      const stockValue = firstDefined(variant, STOCK_KEYS);

      variants.push({
        spinId,
        name,
        price,
        mrp: mrp !== undefined && mrp > price ? mrp : undefined,
        quantityLabel: asString(firstDefined(variant, QUANTITY_LABEL_KEYS)),
        imageUrl: asString(firstDefined(variant, IMAGE_KEYS)) ?? productImage,
        inStock: typeof stockValue === 'boolean' ? stockValue : undefined,
      });
    }
  }

  if (variants.length === 0 && rawProducts.length > 0) {
    // Node's console.log truncates nested objects past depth 2, which hid the variant fields
    // inside sampleProduct.variations last time — pull the first variant entry out to its own
    // top-level key so its fields are actually visible in the log this time.
    const sampleProduct = asRecord(rawProducts[0]);
    const sampleVariant = sampleProduct ? firstArray(sampleProduct, VARIANT_LIST_KEYS)[0] : undefined;
    logger.warn('[diagnostic] normalizeProducts: found a products array but parsed no variants', {
      topLevelKeys: Object.keys(data),
      sampleProduct: rawProducts[0],
      sampleVariant,
    });
  }

  return variants;
}

const ADDRESS_LIST_KEYS = ['addresses', 'items', 'results'];
const ADDRESS_ID_KEYS = ['id', 'addressId'];
const ADDRESS_LABEL_KEYS = ['fullAddress', 'label', 'addressLine', 'address'];
const ADDRESS_NAME_KEYS = ['userName', 'receiverName', 'name'];
const ADDRESS_DEFAULT_KEYS = ['isDefault', 'default'];

export function normalizeAddresses(raw: unknown): AddressSummary[] {
  const data = unwrapEnvelope(raw);
  if (!data) return [];

  const rawAddresses = firstArray(data, ADDRESS_LIST_KEYS);
  const addresses: AddressSummary[] = [];

  for (const entry of rawAddresses) {
    const address = asRecord(entry);
    if (!address) continue;

    const id = asString(firstDefined(address, ADDRESS_ID_KEYS));
    const label = asString(firstDefined(address, ADDRESS_LABEL_KEYS));
    if (!id || !label) continue;

    const isDefaultValue = firstDefined(address, ADDRESS_DEFAULT_KEYS);

    addresses.push({
      id,
      label,
      userName: asString(firstDefined(address, ADDRESS_NAME_KEYS)),
      isDefault: typeof isDefaultValue === 'boolean' ? isDefaultValue : undefined,
    });
  }

  return addresses;
}
