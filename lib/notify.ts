// lib/notify.ts
import type { Meal } from './normalize';
import type { ImpactOrder } from './impact';

export const MEAL_LABEL: Record<Meal, string> = { lunch: '12:30 PM', dinner: '7:30 PM' };

export type NotificationStatus = 'sent' | 'failed_no_phone' | 'deduped' | 'pending_consent';

export interface NotifyItem {
  order: ImpactOrder;
  backup: { cookId: string; cookName: string; cuisine: string; tier: 1 | 2 };
}

export interface NotificationRecord {
  id: string;
  subscriberName: string;
  orderIds: string[];
  message: string;
  status: NotificationStatus;
  atSec: number;
  tier: 1 | 2;
}

const firstName = (n: string) => n.trim().split(/\s+/)[0];

function mealsText(items: NotifyItem[]): string {
  const counts = new Map<Meal, number>();
  for (const i of items) counts.set(i.order.meal, (counts.get(i.order.meal) ?? 0) + 1);
  return [...counts.entries()]
    .map(([meal, n]) => `${meal} today (${MEAL_LABEL[meal]}${n > 1 ? `, ${n} orders` : ''})`)
    .join(' and ');
}

// Messages are built from data. No LLM writes any fact in them.
export function renderMessage(items: NotifyItem[], oldCookName: string): string {
  const first = items[0];
  const name = firstName(first.order.subscriberName);
  const meals = mealsText(items);
  const { cookName, tier, cuisine: newCuisine } = first.backup;
  const oldCuisine = first.order.cuisine;
  if (tier === 1)
    return (
      `Hi ${name}, your ${meals} will be made by ${cookName} instead of ${oldCookName}, who is unavailable. ` +
      `Same ${oldCuisine} menu and delivery window. Reply 1 to confirm or 2 for another option or a refund. ` +
      `If we don't hear from you, your meal will go ahead as planned.`
    );
  return (
    `Hi ${name}, your ${meals} can't be made by ${oldCookName}, who is unavailable. ` +
    `${cookName} can cook it instead, but this will be ${newCuisine} instead of ${oldCuisine}. ` +
    `Reply 1 to accept or 2 for a refund. We won't send this meal unless you accept.`
  );
}

// One message per PERSON (grouped by phone key), not per order or per subscriber record.
export function buildNotifications(args: {
  oldCookName: string;
  items: NotifyItem[];
  atSec: number;
  nextId: () => string;
}): NotificationRecord[] {
  const { oldCookName, items, atSec, nextId } = args;
  const groups = new Map<string, NotifyItem[]>();
  for (const it of items) {
    const k = `${it.order.personKey}|${it.backup.cookId}|${it.backup.tier}`;
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }

  const out: NotificationRecord[] = [];
  for (const group of groups.values()) {
    const primary = group[0];
    const tier = primary.backup.tier;
    const status: NotificationStatus = primary.order.phone ? (tier === 1 ? 'sent' : 'pending_consent') : 'failed_no_phone';
    out.push({
      id: nextId(), subscriberName: primary.order.subscriberName,
      orderIds: group.map((g) => g.order.orderId),
      message: renderMessage(group, oldCookName), status, atSec, tier,
    });

    // Other subscriber records for the same person are logged as deduped, not messaged again.
    const seen = new Set([primary.order.subscriberId]);
    for (const g of group) {
      if (seen.has(g.order.subscriberId)) continue;
      seen.add(g.order.subscriberId);
      out.push({
        id: nextId(), subscriberName: g.order.subscriberName,
        orderIds: group.filter((x) => x.order.subscriberId === g.order.subscriberId).map((x) => x.order.orderId),
        message: `Not sent separately. Same phone number as ${primary.order.subscriberName}, who received one combined message.`,
        status: 'deduped', atSec, tier,
      });
    }
  }
  return out;
}