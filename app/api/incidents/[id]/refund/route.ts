// app/api/incidents/[id]/refund/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NotFoundError, refundOrders } from '@/lib/store';


const Body = z.object({ orderIds: z.array(z.string()).min(1) });

export async function POST(req: Request, { params }: { params: any }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  try {
    return NextResponse.json(await refundOrders(id, body.data.orderIds));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof NotFoundError ? 404 : 500 });
  }
}