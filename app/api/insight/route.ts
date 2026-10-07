import { NextResponse } from 'next/server';
import { buildLeadership } from '@/lib/leadership';
import { geminiText } from '@/lib/gemini';


let cache: { text: string; source: 'gemini' | 'fallback' } | null = null;

export async function GET() {
  if (cache) return NextResponse.json(cache);

  const d = buildLeadership();
  const [a, b] = d.byCook;
  const bothActive = a?.sheetStatus === 'active' && b?.sheetStatus === 'active';

  const fallback =
    a && b
      ? `${a.name} and ${b.name} account for ${d.kpis.topTwoShare}% of the ${d.kpis.events} dropout events ` +
        `in the last 30 days${bothActive ? ' and both are still marked active' : ''}.`
      : `${d.kpis.events} dropout events in the last 30 days.`;

  const facts = JSON.stringify({
    totalEvents: d.kpis.events,
    byCity: d.byCity,
    topCooks: d.byCook.slice(0, 5),
    repeatOffenders: d.kpis.repeatOffenders,
    topTwoSharePercent: d.kpis.topTwoShare,
  });

  const text = await geminiText(
    'Write ONE sentence (max 40 words) for an operations leader summarizing the most ' +
      'important dropout pattern. Use only the numbers in this JSON. Do not add ' +
      'causes, advice, or any figure not present.\n' + facts,
  );

  cache = text ? { text, source: 'gemini' } : { text: fallback, source: 'fallback' };
  return NextResponse.json(cache);
}