import { NextResponse } from 'next/server';
import { getLeadershipInsights } from '@/lib/insights';

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { refresh?: boolean };
  return NextResponse.json(await getLeadershipInsights(body.refresh === true));
}