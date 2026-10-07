// lib/match.ts
import { TODAY } from './clock';
import type { Cook, Dataset, Meal } from './normalize';
import { type ImpactOrder, sortOrders } from './impact';

// ---- documented assumptions (change here, nowhere else) ----
// max_daily_orders is read as a cap per day across lunch + dinner. 'per_meal' is the alternative reading.
export const CAPACITY_MODE: 'per_day' | 'per_meal' = 'per_day';
// Cooks with this many dropout events in the last 30 days are never auto-proposed as a backup.
export const MAX_RECENT_DROPOUTS = 3;
// Initial proposal counts as attempt 1. After this many rejected attempts the order goes to Ops.
export const MAX_ATTEMPTS = 2;

export type UncoveredReason = 'no_capacity' | 'diet_mismatch' | 'no_cook_in_city';

export interface CookStats {
  cook: Cook;
  openToday: Record<Meal, number>;
  dropouts30d: number;
}

function shiftDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export function buildCookStats(data: Dataset): Map<string, CookStats> {
  const stats = new Map<string, CookStats>();
  for (const cook of data.cooks) stats.set(cook.cookId, { cook, openToday: { lunch: 0, dinner: 0 }, dropouts30d: 0 });

  const start = shiftDays(TODAY, -30);
  const seen = new Set<string>();
  for (const o of data.orders) {
    const s = stats.get(o.cookId);
    if (!s) continue;
    if (o.date === TODAY && (o.status === 'pending' || o.status === 'in_progress')) s.openToday[o.meal]++;
    if (o.status === 'cook_dropout' && o.date >= start && o.date <= TODAY) {
      const k = `${o.cookId}|${o.date}|${o.meal}`;
      if (!seen.has(k)) { seen.add(k); s.dropouts30d++; }
    }
  }
  return stats;
}

// Capacity ledger: shared across ALL incidents so a backup can never be double-booked.
export class Ledger {
  private used = new Map<string, Record<Meal, number>>();
  private row(id: string) {
    let r = this.used.get(id);
    if (!r) { r = { lunch: 0, dinner: 0 }; this.used.set(id, r); }
    return r;
  }
  reserve(cookId: string, meal: Meal) { this.row(cookId)[meal]++; }
  release(cookId: string, meal: Meal) { const r = this.row(cookId); r[meal] = Math.max(0, r[meal] - 1); }
  total(cookId: string) { const r = this.row(cookId); return r.lunch + r.dinner; }
  meal(cookId: string, meal: Meal) { return this.row(cookId)[meal]; }
}

export interface MatchContext {
  stats: Map<string, CookStats>;
  ledger: Ledger;
  excludedCooks: Set<string>; // every cook with an incident today, whatever the sheet says
}

export function freeSlots(s: CookStats, ledger: Ledger, meal: Meal): number {
  return CAPACITY_MODE === 'per_day'
    ? s.cook.maxDaily - (s.openToday.lunch + s.openToday.dinner) - ledger.total(s.cook.cookId)
    : s.cook.maxDaily - s.openToday[meal] - ledger.meal(s.cook.cookId, meal);
}

export interface Recommendation {
  cookId: string;
  cookName: string;
  tier: 1 | 2;
  free: number;
  dropouts: number;
  cuisine: string;
  reasons: string[];
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function rank(a: Recommendation, b: Recommendation, joined: (id: string) => string) {
  return a.dropouts - b.dropouts || b.free - a.free || joined(a.cookId).localeCompare(joined(b.cookId)) || a.cookId.localeCompare(b.cookId);
}

export function pickBackup(order: ImpactOrder, ctx: MatchContext, rejected: Set<string> = new Set()): Recommendation | null {
  const recs: Recommendation[] = [];
  for (const s of ctx.stats.values()) {
    const c = s.cook;
    if (c.status !== 'active' || c.city !== order.city) continue;
    if (!c.serves.includes(order.diet)) continue;
    if (ctx.excludedCooks.has(c.cookId) || rejected.has(c.cookId)) continue;
    if (s.dropouts30d >= MAX_RECENT_DROPOUTS) continue;
    const free = freeSlots(s, ctx.ledger, order.meal);
    if (free <= 0) continue;
    const tier: 1 | 2 = c.cuisine === order.cuisine ? 1 : 2;
    recs.push({
      cookId: c.cookId, cookName: c.name, tier, free, dropouts: s.dropouts30d, cuisine: c.cuisine,
      reasons: [
        'Active', c.city, `Serves ${order.diet}`,
        tier === 1 ? `Same cuisine (${c.cuisine})` : `Different cuisine: ${c.cuisine} (needs consent)`,
        plural(free, 'free slot'), `${plural(s.dropouts30d, 'dropout')} in 30d`,
      ],
    });
  }
  const joined = (id: string) => ctx.stats.get(id)!.cook.joined;
  const best = (t: 1 | 2) => recs.filter((r) => r.tier === t).sort((a, b) => rank(a, b, joined))[0];
  return best(1) ?? best(2) ?? null;
}

export function diagnoseUncovered(order: ImpactOrder, ctx: MatchContext): UncoveredReason {
  const inCity = [...ctx.stats.values()].filter(
    (s) => s.cook.status === 'active' && s.cook.city === order.city && !ctx.excludedCooks.has(s.cook.cookId),
  );
  if (!inCity.length) return 'no_cook_in_city';
  if (!inCity.some((s) => s.cook.serves.includes(order.diet))) return 'diet_mismatch';
  return 'no_capacity';
}

export interface Allocation {
  order: ImpactOrder;
  rec: Recommendation | null;
  reason: UncoveredReason | null;
}

// Evaluate PER ORDER, in deadline order (lunch first), across every incident together.
// Ties: longest-tenured subscriber, then order id. Capacity is reserved as each order is assigned.
export function allocate(orders: ImpactOrder[], ctx: MatchContext): Map<string, Allocation> {
  const out = new Map<string, Allocation>();
  for (const order of [...orders].sort(sortOrders)) {
    const rec = pickBackup(order, ctx);
    if (rec) {
      ctx.ledger.reserve(rec.cookId, order.meal);
      out.set(order.orderId, { order, rec, reason: null });
    } else {
      out.set(order.orderId, { order, rec: null, reason: diagnoseUncovered(order, ctx) });
    }
  }
  return out;
}