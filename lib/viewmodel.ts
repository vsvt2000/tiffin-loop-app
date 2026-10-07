// lib/viewmodel.ts
import { NOW, minutesToMeal, simulatedIso } from './clock';
import { deriveState, type DomainIncident, type OrderRec, type World } from './incident';
import type {
  AffectedOrder, Assignment, Incident, Meal, Notification, OpsPayload, Uncovered,
} from './types';

function toIncident(inc: DomainIncident, world: World): Incident {
  const minutesToMealMap: Partial<Record<Meal, number>> = {};
  for (const m of inc.impact.meals) minutesToMealMap[m] = minutesToMeal(m);

  const affected: AffectedOrder[] = inc.recs.map((r: OrderRec) => ({
    orderId: r.order.orderId, subscriberId: r.order.subscriberId, subscriberName: r.order.subscriberName,
    meal: r.order.meal, diet: r.order.diet, cuisine: r.order.cuisine, amountInr: r.order.amountInr,
    flags: { ...r.order.flags },
  }));

  const assignments: Assignment[] = inc.recs
    .filter((r) => r.current)
    .map((r) => ({
      orderId: r.order.orderId, subscriberName: r.order.subscriberName, meal: r.order.meal,
      backupCookId: r.current!.rec.cookId, backupCookName: r.current!.rec.cookName,
      tier: r.current!.rec.tier, status: r.current!.status, reasons: r.current!.rec.reasons,
    }));

  const uncovered: Uncovered[] = inc.recs
    .filter((r) => !r.current)
    .map((r) => ({
      orderId: r.order.orderId, subscriberName: r.order.subscriberName, meal: r.order.meal,
      reason: r.uncoveredReason ?? 'no_capacity', amountInr: r.order.amountInr,
    }));

  const notifications: Notification[] = inc.notifications.map((n) => ({
    id: n.id, subscriberName: n.subscriberName, orderIds: n.orderIds, message: n.message,
    status: n.status, at: simulatedIso(n.atSec),
  }));

  return {
    id: inc.id, cookId: inc.detected.cookId, cookName: inc.cookName, city: inc.city, cuisine: inc.cuisine,
    meals: inc.impact.meals, reason: inc.detected.reason, sources: inc.detected.sources,
    originalMessage: inc.detected.originalMessage, detectedAt: simulatedIso(0),
    state: deriveState(inc), requiresApproval: inc.requiresApproval, approvalReasons: inc.approvalReasons,
    minutesToMeal: minutesToMealMap, affected, assignments, uncovered, notifications,
    events: world.log.forIncident(inc.id).map(({ id, at, type, actor, summary }) => ({ id, at, type, actor, summary })),
  };
}

export function toOpsPayload(world: World, ephemeral: boolean): OpsPayload {
  return {
    incidents: world.incidents.map((i) => toIncident(i, world)),
    scheduledNotices: world.detection.notices,
    meta: { now: NOW, ephemeral },
  };
}