// app/api/incidents/[id]/reply/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ConflictError, NotFoundError, replyToOrders } from '@/lib/store';


const Body = z.object({
  orderIds: z.array(z.string()).min(1),
  reply: z.enum(['1', '2', 'timeout']),
});

export async function POST(req: Request, { params }: { params: any }) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  try {
    return NextResponse.json(await replyToOrders(id, body.data.orderIds, body.data.reply));
  } catch (e) {
    const status = e instanceof NotFoundError ? 404 : e instanceof ConflictError ? 409 : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}