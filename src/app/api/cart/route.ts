import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { McpClient } from '@/mcp/client/mcp-client';
import { InstamartAdapter } from '@/mcp/instamart/instamart-adapter';
import { getSessionAndAccessToken } from '@/mcp/instamart/session';
import { CartService } from '@/services/cart/cart-service';
import { logger } from '@/utils/logger';

const cartActionSchema = z.object({
  action: z.enum(['setQuantity', 'remove', 'clear']),
  spinId: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  addressId: z.string().optional(),
});

/**
 * Deterministic cart mutations for the UI's quick-action buttons (+/-, remove, clear) — these
 * call Instamart directly through CartService, bypassing the LLM/chat loop entirely, so they're
 * instant and can't misreport a price or quantity the way free-text chat replies have.
 */
async function withCartService(
  request: NextRequest,
  fn: (cartService: CartService) => ReturnType<CartService['getCart']>,
): Promise<NextResponse> {
  const session = await getSessionAndAccessToken(request);

  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated. Visit /api/instamart/auth/login first.' },
      { status: 401 },
    );
  }

  const mcpClient = new McpClient();
  await mcpClient.connect(session.accessToken);

  try {
    const cartService = new CartService(new InstamartAdapter(mcpClient));
    const cart = await fn(cartService);
    return NextResponse.json(cart);
  } catch (error) {
    logger.error('Cart request failed', { error });
    return NextResponse.json(
      { error: 'Something went wrong handling the cart request.' },
      { status: 500 },
    );
  } finally {
    await mcpClient.disconnect();
  }
}

export async function GET(request: NextRequest) {
  return withCartService(request, (cartService) => cartService.getCart());
}

export async function POST(request: NextRequest) {
  const parsed = cartActionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, spinId, quantity, addressId } = parsed.data;

  if ((action === 'setQuantity' || action === 'remove') && !spinId) {
    return NextResponse.json({ error: '"spinId" is required for this action.' }, { status: 400 });
  }

  if (action === 'setQuantity' && quantity === undefined) {
    return NextResponse.json({ error: '"quantity" is required for setQuantity.' }, { status: 400 });
  }

  return withCartService(request, (cartService) => {
    if (action === 'clear') return cartService.clearCart();
    if (action === 'remove') return cartService.removeItem(spinId!, addressId);
    return cartService.setItemQuantity({ spinId: spinId!, quantity: quantity! }, addressId);
  });
}
