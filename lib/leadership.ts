import { loadData } from '@/lib/normalize'; // ADAPT
import { NOW } from '@/lib/clock';
import type { LeadershipPayload } from '@/lib/types';

const REPEAT_THRESHOLD = 3;

function shiftDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return t.toISOString().slice(0, 10);
}

export function buildLeadership(): LeadershipPayload {
  const { cooks, orders } = loadData(); // ADAPT
  const end = NOW.slice(0, 10);
  const start = shiftDays(end, -30);

  // One event = unique (cook, date, meal) carrying an explicit dropout status.
  const seen = new Set<string>();
  const events: { cookId: string; date: string }[] = [];
  for (const o of orders) {
    if (o.status !== 'cook_dropout') continue;
    if (o.date < start || o.date > end) continue;
    const key = `${o.cookId}|${o.date}|${o.meal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ cookId: o.cookId, date: o.date });
  }

  const cookById = new Map(cooks.map((c: any) => [c.cookId, c]));
  const perCook = new Map<string, number>();
  const perCity = new Map<string, number>();
  const perDay = new Map<string, number>();

  for (const e of events) {
    perCook.set(e.cookId, (perCook.get(e.cookId) ?? 0) + 1);
    const city = (cookById.get(e.cookId) as any)?.city ?? 'Unknown';
    perCity.set(city, (perCity.get(city) ?? 0) + 1);
    perDay.set(e.date, (perDay.get(e.date) ?? 0) + 1);
  }

  const byCook = [...perCook.entries()]
    .map(([cookId, n]) => {
      const c: any = cookById.get(cookId);
      return {
        cookId,
        name: c?.name ?? cookId,
        city: c?.city ?? 'Unknown',
        events: n,
        sheetStatus: c?.status ?? 'unknown',
        stillActiveRisk: c?.status === 'active' && n >= REPEAT_THRESHOLD,
      };
    })
    .sort((a, b) => b.events - a.events);

  const cities = ['Bengaluru', 'Mumbai', 'Pune'];
  const byCity = cities.map((city) => {
    const activeCooks = cooks.filter((c: any) => c.city === city && c.status === 'active').length;
    const n = perCity.get(city) ?? 0;
    return { city, events: n, activeCooks, perCook: activeCooks ? +(n / activeCooks).toFixed(2) : 0 };
  });

  const trend: { date: string; events: number }[] = [];
  for (let d = start; d <= end; d = shiftDays(d, 1)) {
    trend.push({ date: d, events: perDay.get(d) ?? 0 });
  }

  const total = events.length;
  const topTwo = byCook.slice(0, 2).reduce((s, c) => s + c.events, 0);

  return {
    window: { start, end },
    definition:
      'A dropout event is a unique cook + date + meal with an explicit dropout status ' +
      '(cook dropout, cook no-show, or cancelled because the cook was unavailable). ' +
      'Plain cancelled and refunded orders are excluded because their cause is not recorded.',
    kpis: {
      events: total,
      cooksWithEvents: byCook.length,
      repeatOffenders: byCook.filter((c) => c.events >= REPEAT_THRESHOLD).length,
      topTwoShare: total ? Math.round((topTwo / total) * 100) : 0,
    },
    byCity,
    byCook,
    trend,
  };
}