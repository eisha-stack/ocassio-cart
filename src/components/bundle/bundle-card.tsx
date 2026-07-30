'use client';

import type { ProductVariant } from '@/types/product';

interface ProductListProps {
  products: ProductVariant[];
  /** spinId -> quantity currently in cart, so an already-added item shows a stepper instead of "ADD". */
  cartQuantities: Record<string, number>;
  busy?: boolean;
  onAdd: (product: ProductVariant) => void;
  onIncrement: (spinId: string) => void;
  onDecrement: (spinId: string) => void;
}

/** Horizontally-scrollable row of product options, straight from Instamart's search_products result. */
export function ProductList({
  products,
  cartQuantities,
  busy,
  onAdd,
  onIncrement,
  onDecrement,
}: ProductListProps) {
  if (products.length === 0) return null;

  return (
    <div className="flex w-full max-w-md gap-3 overflow-x-auto pb-1">
      {products.map((product) => {
        const quantity = cartQuantities[product.spinId] ?? 0;

        return (
          <div
            key={product.spinId}
            className="w-36 shrink-0 rounded-2xl border border-surface-border bg-white p-3 shadow-card"
          >
            <div className="mb-2 flex h-16 w-full items-center justify-center rounded-lg bg-surface-bg text-2xl">
              🛒
            </div>
            <p className="line-clamp-2 min-h-[2.5em] text-xs font-medium text-ink">
              {product.name}
            </p>
            {product.quantityLabel && (
              <p className="text-[11px] text-ink-muted">{product.quantityLabel}</p>
            )}
            {product.mrp && (
              <p className="text-[11px] text-ink-muted">
                <span className="line-through">₹{product.mrp}</span>{' '}
                <span className="font-medium text-accent">
                  {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
                </span>
              </p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">₹{product.price}</span>

              {quantity === 0 ? (
                <button
                  onClick={() => onAdd(product)}
                  disabled={busy || product.inStock === false}
                  className="rounded-full border border-brand px-3 py-1 text-xs font-bold text-brand disabled:opacity-50"
                >
                  {product.inStock === false ? 'N/A' : 'ADD'}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full border border-brand">
                  <button
                    onClick={() => onDecrement(product.spinId)}
                    disabled={busy}
                    className="px-2 py-0.5 text-sm font-bold text-brand disabled:opacity-50"
                    aria-label={`Decrease ${product.name} quantity`}
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold text-ink">{quantity}</span>
                  <button
                    onClick={() => onIncrement(product.spinId)}
                    disabled={busy}
                    className="px-2 py-0.5 text-sm font-bold text-brand disabled:opacity-50"
                    aria-label={`Increase ${product.name} quantity`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
