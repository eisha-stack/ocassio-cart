'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentResponse, PendingToolAction } from '@/types/agent';
import type { CartSnapshot } from '@/types/cart';
import type { ProductVariant } from '@/types/product';
import { Button } from '@/components/ui/button';
import { CartSummary } from '@/components/cart/cart-summary';
import { ProductList } from '@/components/bundle/bundle-card';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: ProductVariant[];
  showCart?: boolean;
  suggestions?: string[];
}

const STARTER_SUGGESTIONS = [
  '🎬 Movie night for 4 under ₹1000',
  '💑 Date night for 2 under ₹800',
  '🎉 House party snacks',
  '🛒 Show my cart',
];

const EMPTY_CART: CartSnapshot = { items: [], total: 0 };

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

async function postJson<T>(
  url: string,
  body: unknown,
  method: 'GET' | 'POST' = 'POST',
): Promise<{ status: number; data: T }> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: (await res.json()) as T };
}

export function ChatWindow() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingToolAction | null>(null);
  const [cart, setCart] = useState<CartSnapshot | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [meResult, cartResult] = await Promise.all([
        postJson<{ authenticated: boolean; name?: string }>('/api/instamart/me', null, 'GET'),
        postJson<CartSnapshot | { error: unknown }>('/api/cart', null, 'GET'),
      ]);

      if (cancelled) return;

      if (meResult.status === 401 && cartResult.status === 401) {
        setAuthError(true);
        setInitializing(false);
        return;
      }

      if ('items' in cartResult.data) {
        setCart(cartResult.data);
      }

      const name = meResult.status === 200 ? meResult.data.name : undefined;
      const greeting = name
        ? `Hey ${name}! 👋 I'm your OccasioCart assistant — I plan grocery bundles for any occasion and add them straight to your Instamart cart.`
        : "Hey there! 👋 I'm your OccasioCart assistant — I plan grocery bundles for any occasion and add them straight to your Instamart cart.";

      setMessages([
        {
          id: newId(),
          role: 'assistant',
          content: `${greeting} What are we shopping for today?`,
          suggestions: STARTER_SUGGESTIONS,
        },
      ]);
      setInitializing(false);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, cart]);

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart?.items ?? []) map[item.spinId] = item.quantity;
    return map;
  }, [cart]);

  async function sendChat(body: { message?: string; confirmedAction?: PendingToolAction }) {
    setBusy(true);
    setAuthError(false);

    try {
      const { status, data } = await postJson<AgentResponse | { error: unknown }>('/api/chat', body);

      if (status === 401) {
        setAuthError(true);
        return;
      }

      if (status >= 400 || !('message' in data)) {
        const errorText = 'error' in data ? JSON.stringify(data.error) : 'Request failed';
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'assistant', content: `Something went wrong: ${errorText}` },
        ]);
        return;
      }

      if (data.cart) setCart(data.cart);

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content: data.message,
          products: data.products,
          showCart: !!data.cart,
          suggestions: data.suggestions,
        },
      ]);
      setPendingAction(data.requiresConfirmation && data.pendingAction ? data.pendingAction : null);
    } finally {
      setBusy(false);
    }
  }

  function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;

    setMessages((prev) => [...prev, { id: newId(), role: 'user', content: message }]);
    setInput('');
    void sendChat({ message });
  }

  function handleConfirm() {
    if (!pendingAction) return;
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'user', content: `Confirm ${pendingAction.tool.replace('_', ' ')}` },
    ]);
    void sendChat({ confirmedAction: pendingAction });
  }

  function handleCancel() {
    setPendingAction(null);
    setMessages((prev) => [...prev, { id: newId(), role: 'user', content: 'Cancel' }]);
  }

  async function mutateCart(action: 'setQuantity' | 'remove' | 'clear', spinId?: string, quantity?: number) {
    setCartBusy(true);
    setAuthError(false);
    setCartError(null);
    try {
      const { status, data } = await postJson<CartSnapshot | { error: unknown }>('/api/cart', {
        action,
        spinId,
        quantity,
      });

      if (status === 401) {
        setAuthError(true);
        return;
      }

      if ('items' in data) {
        setCart(data);
        return;
      }

      // Non-2xx or a response without the expected shape — surface it instead of silently
      // doing nothing, which previously looked exactly like "the button doesn't work."
      setCartError('error' in data ? JSON.stringify(data.error) : `Cart update failed (status ${status}).`);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Cart update failed — network error.');
    } finally {
      setCartBusy(false);
    }
  }

  function handleAddProduct(product: ProductVariant) {
    void mutateCart('setQuantity', product.spinId, 1);
  }

  function handleIncrement(spinId: string) {
    void mutateCart('setQuantity', spinId, (cartQuantities[spinId] ?? 0) + 1);
  }

  function handleDecrement(spinId: string) {
    const next = (cartQuantities[spinId] ?? 0) - 1;
    void mutateCart(next <= 0 ? 'remove' : 'setQuantity', spinId, next);
  }

  function handleRemove(spinId: string) {
    void mutateCart('remove', spinId);
  }

  function handleClear() {
    void mutateCart('clear');
  }

  function handleCheckout() {
    setCartDrawerOpen(false);
    handleSend('Please place my order.');
  }

  const cartItemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="mx-auto flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
      <header className="flex items-center gap-2 border-b border-surface-border bg-brand px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-brand">
          OC
        </div>
        <div>
          <p className="text-sm font-bold text-white">OccasioCart</p>
          <p className="text-[11px] text-brand-light">Shopping assistant · Instamart</p>
        </div>
      </header>

      {authError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          Not authenticated with Instamart.{' '}
          <a href="/api/instamart/auth/login" className="font-semibold underline">
            Log in
          </a>{' '}
          then refresh.
        </div>
      )}

      {cartError && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <span>Couldn&apos;t update cart: {cartError}</span>
          <button onClick={() => setCartError(null)} className="ml-2 font-semibold" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-surface-bg px-4 py-4">
        {initializing && (
          <div className="flex gap-1 px-1">
            <span className="typing-dot h-2 w-2 rounded-full bg-ink-muted [animation-delay:-0.32s]" />
            <span className="typing-dot h-2 w-2 rounded-full bg-ink-muted [animation-delay:-0.16s]" />
            <span className="typing-dot h-2 w-2 rounded-full bg-ink-muted" />
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-brand px-3.5 py-2 text-sm text-white'
                  : 'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-surface-border bg-white px-3.5 py-2 text-sm text-ink shadow-card'
              }
            >
              {m.content}
            </div>

            {m.products && m.products.length > 0 && (
              <ProductList
                products={m.products}
                cartQuantities={cartQuantities}
                busy={cartBusy}
                onAdd={handleAddProduct}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
              />
            )}

            {m.showCart && (
              <CartSummary
                cart={cart ?? EMPTY_CART}
                busy={cartBusy}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onRemove={handleRemove}
                onClear={handleClear}
                onCheckout={handleCheckout}
              />
            )}

            {m.suggestions && m.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {m.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s.replace(/^[^\s]+\s/, ''))}
                    disabled={busy}
                    className="rounded-full border border-brand bg-white px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-light disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {pendingAction && (
          <div className="max-w-[85%] rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="mb-2 font-semibold text-ink">
              Confirm {pendingAction.tool === 'checkout' || pendingAction.tool === 'confirm_order'
                ? 'placing your order'
                : pendingAction.tool.replace('_', ' ')}
              ?
            </p>
            <p className="mb-2 text-xs text-ink-muted">
              This will {pendingAction.tool.includes('order') || pendingAction.tool === 'checkout'
                ? 'place a real order on your Instamart account.'
                : 'run a gated action on your Instamart account.'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleConfirm} disabled={busy}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {busy && (
          <div className="flex gap-1 px-1">
            <span className="typing-dot h-2 w-2 rounded-full bg-ink-muted [animation-delay:-0.32s]" />
            <span className="typing-dot h-2 w-2 rounded-full bg-ink-muted [animation-delay:-0.16s]" />
            <span className="typing-dot h-2 w-2 rounded-full bg-ink-muted" />
          </div>
        )}
      </div>

      {cartDrawerOpen && cart && cart.items.length > 0 && (
        <div className="border-t border-surface-border bg-surface-bg p-3">
          <CartSummary
            cart={cart}
            busy={cartBusy}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onClear={handleClear}
            onCheckout={handleCheckout}
          />
        </div>
      )}

      {cartItemCount > 0 && (
        <button
          onClick={() => setCartDrawerOpen((open) => !open)}
          className="flex items-center justify-between bg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          <span>
            {cartItemCount} item{cartItemCount > 1 ? 's' : ''} · ₹{cart?.total ?? 0}
          </span>
          <span>{cartDrawerOpen ? 'Hide cart ▲' : 'View cart ▼'}</span>
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 border-t border-surface-border bg-white p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Plan a movie night for 4 people under ₹1000…"
          className="flex-1 rounded-full border border-surface-border px-4 py-2 text-sm outline-none focus:border-brand"
          disabled={busy || initializing}
        />
        <Button type="submit" disabled={busy || initializing || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
