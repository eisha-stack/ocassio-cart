'use client';

import type { CartSnapshot } from '@/types/cart';
import { Button } from '@/components/ui/button';

interface CartSummaryProps {
  cart: CartSnapshot;
  busy?: boolean;
  onIncrement: (spinId: string) => void;
  onDecrement: (spinId: string) => void;
  onRemove: (spinId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

/** Renders the cart exactly as Instamart's own get_cart/update_cart response reported it. */
export function CartSummary({
  cart,
  busy,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onCheckout,
}: CartSummaryProps) {
  if (cart.raw !== undefined) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-white p-3 text-sm text-ink-muted shadow-card">
        Got your cart back from Instamart, but couldn&apos;t read the details in the expected
        format. Try asking me to show the cart again.
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-white p-4 text-sm text-ink-muted shadow-card">
        Your cart is empty.
      </div>
    );
  }

  const totalSavings = cart.items.reduce(
    (sum, item) => sum + (item.mrp ? (item.mrp - item.price) * item.quantity : 0),
    0,
  );

  return (
    <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
        <span className="text-sm font-semibold text-ink">Your Cart</span>
        <button
          onClick={onClear}
          disabled={busy}
          className="text-xs font-medium text-ink-muted hover:text-red-600 disabled:opacity-50"
        >
          Clear cart
        </button>
      </div>

      <ul className="divide-y divide-surface-border">
        {cart.items.map((item) => (
          <li key={item.spinId} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{item.name}</p>
              <p className="text-xs text-ink-muted">
                ₹{item.price} each
                {item.mrp && (
                  <>
                    {' '}
                    <span className="line-through">₹{item.mrp}</span>{' '}
                    <span className="font-medium text-accent">
                      {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% off
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-brand">
              <button
                onClick={() => (item.quantity <= 1 ? onRemove(item.spinId) : onDecrement(item.spinId))}
                disabled={busy}
                className="px-2 py-1 text-sm font-bold text-brand disabled:opacity-50"
                aria-label={`Decrease ${item.name} quantity`}
              >
                −
              </button>
              <span className="min-w-[1.25rem] text-center text-sm font-semibold text-ink">
                {item.quantity}
              </span>
              <button
                onClick={() => onIncrement(item.spinId)}
                disabled={busy}
                className="px-2 py-1 text-sm font-bold text-brand disabled:opacity-50"
                aria-label={`Increase ${item.name} quantity`}
              >
                +
              </button>
            </div>

            <span className="w-14 text-right text-sm font-semibold text-ink">
              ₹{item.price * item.quantity}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs text-ink-muted">Total</p>
          <p className="text-base font-bold text-ink">₹{cart.total}</p>
          {totalSavings > 0 && (
            <p className="text-xs font-medium text-accent">You saved ₹{totalSavings}</p>
          )}
        </div>
        <Button onClick={onCheckout} disabled={busy}>
          Checkout
        </Button>
      </div>
    </div>
  );
}
