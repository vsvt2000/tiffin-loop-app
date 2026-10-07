// lib/impact.ts
import { MEAL_OPEN_MIN, TODAY, minutesToMeal } from './clock';
import type { City, Dataset, Diet, Meal } from './normalize';

export interface ImpactOrder {
  orderId: string;
  subscriberId: string;
  subscriberName: string;
  city: City;
  meal: Meal;
  diet: Diet;
  cuisine: string;
  amountInr: number;
  startDate: string;
  personKey: string; // phone key, or subscriberId when there is no phone
  phone: string | null;
  flags: { noPhone: boolean; possibleDuplicate: boolean; paused: boolean };
}

export interface MealImpact {
  count: number;
  diet: Record<string, number>;
  amountInr: number;
  minutesToMeal: number;
}

export interface IncidentImpact {
  outcome: 'affected' | 'no_customer_impact';
  meals: Meal[];
  orders: ImpactOrder[];
  byMeal: Partial<Record<Meal, MealImpact>>;
  totalAmountInr: number;
}

const MEAL_RANK: Record<Meal, number> = { lunch: 0, dinner: 1 };
export const sortOrders = (a: ImpactOrder, b: ImpactOrder) =>
  MEAL_RANK[a.meal] - MEAL_RANK[b.meal] ||
  a.startDate.localeCompare(b.startDate) ||
  a.orderId.localeCompare(b.orderId);

export function computeImpact(data: Dataset, cookId: string, meals: Meal[]): IncidentImpact {
  const subs = new Map(data.subscribers.map((s) => [s.subscriberId, s]));
  const dupTargets = new Set(data.subscribers.filter((s) => s.duplicateOf).map((s) => s.duplicateOf as string));

  const orders: ImpactOrder[] = [];
  for (const o of data.orders) {
    if (o.date !== TODAY || o.cookId !== cookId) continue;
    if (o.status !== 'pending' && o.status !== 'in_progress') continue;
    if (!meals.includes(o.meal)) continue;
    const s = subs.get(o.subscriberId);
    if (!s) continue;
    orders.push({
      orderId: o.orderId, subscriberId: s.subscriberId, subscriberName: s.name, city: s.city,
      meal: o.meal, diet: s.diet, cuisine: s.cuisinePref, amountInr: o.amountInr,
      startDate: s.startDate, personKey: s.phone ?? s.subscriberId, phone: s.phone,
      flags: {
        noPhone: !s.phone,
        possibleDuplicate: !!s.duplicateOf || dupTargets.has(s.subscriberId),
        paused: s.status === 'paused',
      },
    });
  }
  orders.sort(sortOrders);

  const byMeal: Partial<Record<Meal, MealImpact>> = {};
  for (const o of orders) {
    const b = (byMeal[o.meal] ??= {
      count: 0, diet: {}, amountInr: 0, minutesToMeal: minutesToMeal(o.meal),
    });
    b.count++;
    b.diet[o.diet] = (b.diet[o.diet] ?? 0) + 1;
    b.amountInr += o.amountInr;
  }

  return {
    outcome: orders.length ? 'affected' : 'no_customer_impact',
    meals: (Object.keys(MEAL_OPEN_MIN) as Meal[]).filter((m) => byMeal[m]),
    orders,
    byMeal,
    totalAmountInr: orders.reduce((s, o) => s + o.amountInr, 0),
  };
}