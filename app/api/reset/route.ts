// app/api/reset/route.ts
import { NextResponse } from 'next/server';
import { resetDemo } from '@/lib/store';


export async function POST() {
  return NextResponse.json(await resetDemo());
}