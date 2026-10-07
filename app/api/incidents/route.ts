// app/api/incidents/route.ts
import { NextResponse } from 'next/server';
import { getOpsPayload } from '@/lib/store';


export async function GET() {
  return NextResponse.json(await getOpsPayload());
}