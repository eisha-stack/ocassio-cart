import { NextResponse } from 'next/server';

// TODO: expose the order placement endpoint backed by container.orderService.
// Must enforce explicit user confirmation (from the client) before placing the order.
export async function POST(_request: Request) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
