import { NextResponse } from 'next/server';
import { buildLeadership } from '@/lib/leadership';


export async function GET() {
  return NextResponse.json(buildLeadership());
}