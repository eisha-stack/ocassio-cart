import { NextResponse } from 'next/server';

// TODO: expose cart read/update endpoints backed by container.cartService.
export async function GET(_request: Request) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

export async function POST(_request: Request) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
