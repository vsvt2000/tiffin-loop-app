// app/api/incidents/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { ConflictError, NotFoundError, approveIncident } from '@/lib/store';


export async function POST(_req: Request, { params }: { params: any }) {
  const { id } = await params;
  try {
    return NextResponse.json(await approveIncident(id));
  } catch (e) {
    const status = e instanceof NotFoundError ? 404 : e instanceof ConflictError ? 409 : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}