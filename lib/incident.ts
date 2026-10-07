// lib/incident.ts
import { loadData, type Dataset, type Meal } from './normalize';
import { detectIncidents, type DetectedIncident, type Detection } from './detect';
import { computeImpact, type ImpactOrder, type IncidentImpact } from './impact';
import {
  MAX_ATTEMPTS, allocate, buildCookStats, Ledger, pickBackup,
  type MatchContext, type Recommendation, type UncoveredReason,
} from './match';
import { EventLog } from './events';
import { buildNotifications, type NotificationRecord } from './notify';
import type { IncidentState } from './types';

// ---------- persisted actions (the only mutable state; everything else is replayed) ----------
export type Action =
  | { type: 'approve'; incidentId: string; atSec: number }
  | { type: 'reply'; incidentId: string; orderIds: string[]; reply: '1' | '2' | 'timeout'; atSec: number }
  | { type: 'refund'; incidentId: string; orderIds: string[]; atSec: number };

export interface PersistedState { actions: Action[] }

export type Outcome = 'pending' | 'reassigned_notified' | 'escalated_to_ops' | 'refunded';
export type AssignStatus = 'proposed' | 'pending_consent' | 'confirmed' | 'rejected' | 'accepted_default';

export interface OrderRec {
  order: ImpactOrder;
  attempts: number;
  rejected: Set<string>;
  current: { rec: Recommendation; status: AssignStatus } | null;
  uncoveredReason: UncoveredReason | null;
  outcome: Outcome;
}

export interface DomainIncident {
  id: string;
  detected: DetectedIncident;
  cookName: string;
  city: string;
  cuisine: string;
  impact: IncidentImpact;
  recs: OrderRec[];
  requiresApproval: boolean;
  approvalReasons: string[];
  approved: boolean;
  closedLogged: boolean;
  notifications: NotificationRecord[];
}

export interface World {
  data: Dataset;
  detection: Detection;
  incidents: DomainIncident[];
  log: EventLog;
  ctx: MatchContext;
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- state machine ----------
// PROPOSED -> (approve) -> NOTIFIED -> CLOSED, or ESCALATED when Ops must act on some orders.
// An incident closes only when every order has a terminal outcome and none is waiting on Ops.
export function deriveState(inc: DomainIncident): IncidentState {
  if (!inc.recs.length) return 'CLOSED';
  if (!inc.approved) return 'PROPOSED';
  if (inc.recs.some((r) => r.outcome === 'pending')) return 'NOTIFIED';
  if (inc.recs.some((r) => r.outcome === 'escalated_to_ops')) return 'ESCALATED';
  return 'CLOSED';
}

export function buildWorld(actions: Action[], dataDir?: string): World {
  const data = loadData(dataDir);
  const detection = detectIncidents(data, dataDir);
  const log = new EventLog();
  const cookById = new Map(data.cooks.map((c) => [c.cookId, c]));
  const stats = buildCookStats(data);
  const ctx: MatchContext = {
    stats, ledger: new Ledger(),
    excludedCooks: new Set(detection.incidents.map((i) => i.cookId)),
  };
  let nid = 0;
  const nextId = () => `NTF-${++nid}`;

  // 1. Detect, compute impact.
  const incidents: DomainIncident[] = detection.incidents.map((d) => {
    const cook = cookById.get(d.cookId)!;
    const impact = computeImpact(data, d.cookId, d.meals);
    return {
      id: d.id, detected: d, cookName: cook.name, city: cook.city, cuisine: cook.cuisine, impact,
      recs: impact.orders.map((order) => ({
        order, attempts: 1, rejected: new Set<string>(), current: null, uncoveredReason: null, outcome: 'pending' as Outcome,
      })),
      requiresApproval: false, approvalReasons: [], approved: false, closedLogged: false, notifications: [],
    };
  });

  // 2. Allocate across ALL incidents together so lunch gets priority and the ledger never double-books.
  const result = allocate(incidents.flatMap((i) => i.impact.orders), ctx);
  for (const inc of incidents)
    for (const r of inc.recs) {
      const a = result.get(r.order.orderId)!;
      if (a.rec) r.current = { rec: a.rec, status: a.rec.tier === 1 ? 'proposed' : 'pending_consent' };
      else r.uncoveredReason = a.reason;
    }

  // 3. Initial events and approval rules.
  for (const inc of incidents) {
    const cook = cookById.get(inc.detected.cookId)!;
    for (const s of inc.detected.signals) {
      if (s.source === 'whatsapp' && s.classification)
        log.add(inc.id, 0, 'DETECTED', s.classification.source === 'rules' ? 'system' : 'gemini',
          `Dropout reported by ${s.sender} at ${hm(s.at!)}: "${s.text}" (${s.classification.source} classification, confidence ${s.classification.confidence.toFixed(2)})`);
      else
        log.add(inc.id, 0, 'DETECTED', 'system',
          `Cook sheet marks ${cook.name} as ${cook.status} since ${cook.statusSince}, but ${plural(inc.impact.orders.length, 'open order')} remain`);
    }
    log.add(inc.id, 1, 'INCIDENT_CREATED', 'system',
      `${inc.id} opened for ${inc.cookName} (${inc.city}, ${inc.cuisine}). Sources: ${inc.detected.sources.join(' + ')}`);

    if (!inc.recs.length) {
      log.add(inc.id, 2, 'IMPACT_COMPUTED', 'system', 'No open orders today: no customer impact');
      log.add(inc.id, 3, 'CLOSED', 'system', 'Closed: no customer impact');
      inc.closedLogged = true;
      continue;
    }
    const l = inc.impact.byMeal.lunch?.count ?? 0;
    const d = inc.impact.byMeal.dinner?.count ?? 0;
    log.add(inc.id, 2, 'IMPACT_COMPUTED', 'system',
      `${plural(inc.recs.length, 'subscriber order')} affected (${l} lunch, ${d} dinner), ${inr(inc.impact.totalAmountInr)} at risk`);

    const t1 = inc.recs.filter((r) => r.current?.rec.tier === 1).length;
    const t2 = inc.recs.filter((r) => r.current?.rec.tier === 2).length;
    const un = inc.recs.filter((r) => !r.current).length;
    log.add(inc.id, 3, 'BACKUP_PROPOSED', 'system',
      `Coverage ${t1 + t2}/${inc.recs.length}: ${t1} exact match, ${t2} relaxed (needs consent), ${un} uncovered`);

    const reasons: string[] = [];
    if (t2) reasons.push(`${plural(t2, 'order')} only have a different-cuisine backup and need subscriber consent`);
    if (un) reasons.push(`${plural(un, 'order')} have no eligible backup (refund exposure ${inr(inc.recs.filter((r) => !r.current).reduce((s, r) => s + r.order.amountInr, 0))})`);
    if (inc.detected.lowConfidence) reasons.push('Detection confidence is below 0.70');
    const np = inc.recs.filter((r) => r.order.flags.noPhone).length;
    if (np) reasons.push(`${plural(np, 'subscriber')} ${np === 1 ? 'has' : 'have'} no phone number: manual call needed`);
    const dp = inc.recs.filter((r) => r.order.flags.possibleDuplicate).length;
    if (dp) reasons.push(`${plural(dp, 'order')} belong to duplicate subscriber records: one message per person`);
    if (inc.recs.some((r) => r.order.flags.paused)) reasons.push('A paused subscriber has an order today');
    inc.approvalReasons = reasons;
    inc.requiresApproval = reasons.length > 0;
  }

  const world: World = { data, detection, incidents, log, ctx };
  for (const a of actions) applyAction(world, a, nextId);
  return world;
}

// ---------- transitions ----------
function maybeClose(inc: DomainIncident, atSec: number, log: EventLog) {
  if (inc.closedLogged || !inc.approved) return;
  if (deriveState(inc) !== 'CLOSED') return;
  inc.closedLogged = true;
  log.add(inc.id, atSec, 'CLOSED', 'system', `All ${inc.recs.length} orders have a resolution and every subscriber is informed. Incident closed.`);
}

function escalate(world: World, inc: DomainIncident, r: OrderRec, atSec: number, why: string) {
  if (r.current) world.ctx.ledger.release(r.current.rec.cookId, r.order.meal);
  r.current = null;
  r.uncoveredReason ??= 'no_capacity';
  r.outcome = 'escalated_to_ops';
  world.log.add(inc.id, atSec, 'ESCALATED', 'system',
    `${r.order.subscriberName} (${r.order.meal}, ${r.order.orderId}): ${why}. Ops: find a cook manually or offer refund/credit (${inr(r.order.amountInr)}).`,
    { orderId: r.order.orderId });
}

function emitNotifications(world: World, inc: DomainIncident, recs: OrderRec[], atSec: number, nextId: () => string) {
  const items = recs
    .filter((r) => r.current)
    .map((r) => ({
      order: r.order,
      backup: { cookId: r.current!.rec.cookId, cookName: r.current!.rec.cookName, cuisine: r.current!.rec.cuisine, tier: r.current!.rec.tier },
    }));
  const byOrder = new Map(recs.map((r) => [r.order.orderId, r]));
  const records = buildNotifications({ oldCookName: inc.cookName, items, atSec, nextId });
  inc.notifications.push(...records);

  for (const n of records) {
    if (n.status === 'deduped') continue;
    const orders = n.orderIds.map((id) => byOrder.get(id)!);
    if (n.status === 'failed_no_phone') {
      world.log.add(inc.id, atSec, 'NOTIFICATION_FAILED', 'system', `No phone number for ${n.subscriberName}: message not sent`, { orderIds: n.orderIds });
      for (const r of orders) escalate(world, inc, r, atSec, 'subscriber unreachable (no phone), manual call needed');
    } else {
      world.log.add(inc.id, atSec, 'NOTIFICATION_SENT', 'system',
        n.status === 'sent'
          ? `Notified ${n.subscriberName} (${plural(n.orderIds.length, 'order')}); opt-out default, meal proceeds unless they reply 2`
          : `Asked ${n.subscriberName} to accept a different-cuisine backup (${plural(n.orderIds.length, 'order')}); no default acceptance`,
        { orderIds: n.orderIds });
      for (const r of orders) if (r.current!.rec.tier === 1) r.outcome = 'reassigned_notified';
    }
  }
}

function applyAction(world: World, a: Action, nextId: () => string) {
  const inc = world.incidents.find((i) => i.id === a.incidentId);
  if (!inc || !inc.recs.length) return;
  const { log } = world;
  const byId = new Map(inc.recs.map((r) => [r.order.orderId, r]));

  if (a.type === 'approve') {
    if (inc.approved) return;
    inc.approved = true;
    log.add(inc.id, a.atSec, 'OPS_APPROVED', 'ops',
      inc.requiresApproval ? 'Ops approved the proposal with exceptions' : 'Ops approved the proposal (one click)');

    const assigned = inc.recs.filter((r) => r.current);
    const groups = new Map<string, OrderRec[]>();
    for (const r of assigned) groups.set(r.current!.rec.cookId, [...(groups.get(r.current!.rec.cookId) ?? []), r]);
    for (const [cookId, rs] of groups) {
      // Unreachable subscribers (no phone) are escalated below, not reassigned.
      const tier1 = rs.filter((r) => r.current!.rec.tier === 1 && r.order.phone);
      for (const r of tier1) r.current!.status = 'accepted_default';
      if (tier1.length)
        log.add(inc.id, a.atSec, 'ORDER_REASSIGNED', 'system',
          `${plural(tier1.length, 'order')} reassigned from ${inc.cookName} to ${rs[0].current!.rec.cookName} (${cookId}, exact match)`,
          { orderIds: tier1.map((r) => r.order.orderId) });
    }
    emitNotifications(world, inc, assigned, a.atSec, nextId);

    const uncovered = inc.recs.filter((r) => !r.current && r.outcome === 'pending');
    if (uncovered.length) {
      const exposure = uncovered.reduce((s, r) => s + r.order.amountInr, 0);
      for (const r of uncovered) r.outcome = 'escalated_to_ops';
      log.add(inc.id, a.atSec, 'ESCALATED', 'system',
        `${plural(uncovered.length, 'subscriber')} uncovered: no eligible backup has capacity or serves their diet. Refund exposure ${inr(exposure)}. Ops decision needed.`,
        { orderIds: uncovered.map((r) => r.order.orderId) });
    }
    maybeClose(inc, a.atSec, log);
    return;
  }

  if (!inc.approved) return;

  if (a.type === 'reply') {
    for (const id of a.orderIds) {
      const r = byId.get(id);
      if (!r || !r.current || r.outcome === 'escalated_to_ops' || r.outcome === 'refunded') continue;
      const cook = r.current.rec;

      if (a.reply === '1') {
        const wasPending = r.outcome === 'pending';
        r.current.status = 'confirmed';
        r.outcome = 'reassigned_notified';
        log.add(inc.id, a.atSec, 'SUBSCRIBER_REPLIED', 'subscriber', `${r.order.subscriberName} replied 1: confirmed ${cook.cookName} for ${r.order.meal}`, { orderId: id });
        if (wasPending)
          log.add(inc.id, a.atSec, 'ORDER_REASSIGNED', 'system', `${r.order.orderId} reassigned to ${cook.cookName} (${cook.cookId}, relaxed match, consent given)`, { orderIds: [id] });
      } else if (a.reply === '2') {
        log.add(inc.id, a.atSec, 'SUBSCRIBER_REPLIED', 'subscriber', `${r.order.subscriberName} replied 2: rejected ${cook.cookName} for ${r.order.meal}`, { orderId: id });
        r.rejected.add(cook.cookId);
        r.current.status = 'rejected';
        world.ctx.ledger.release(cook.cookId, r.order.meal);
        const next = r.attempts < MAX_ATTEMPTS ? pickBackup(r.order, world.ctx, r.rejected) : null;
        if (!next) {
          r.current = null;
          escalate(world, inc, r, a.atSec, r.attempts >= MAX_ATTEMPTS ? `rejected ${r.attempts} replacements, attempt limit reached` : 'rejected the replacement and no other eligible cook has capacity');
          continue;
        }
        r.attempts++;
        world.ctx.ledger.reserve(next.cookId, r.order.meal);
        r.current = { rec: next, status: next.tier === 1 ? 'accepted_default' : 'pending_consent' };
        r.outcome = next.tier === 1 ? 'reassigned_notified' : 'pending';
        log.add(inc.id, a.atSec, 'BACKUP_PROPOSED', 'system', `Re-match for ${r.order.orderId} (attempt ${r.attempts} of ${MAX_ATTEMPTS}): ${next.cookName}, tier ${next.tier}`, { orderId: id });
        if (next.tier === 1)
          log.add(inc.id, a.atSec, 'ORDER_REASSIGNED', 'system', `${r.order.orderId} reassigned to ${next.cookName} (${next.cookId}, exact match)`, { orderIds: [id] });
        emitNotifications(world, inc, [r], a.atSec, nextId);
      } else if (r.outcome === 'pending') {
        // timeout: no reply to a relaxed-match request means not accepted
        escalate(world, inc, r, a.atSec, 'no reply to the relaxed-match request, so it is not accepted');
      }
    }
    maybeClose(inc, a.atSec, log);
    return;
  }

  if (a.type === 'refund') {
    const done = a.orderIds.map((id) => byId.get(id)).filter((r): r is OrderRec => !!r && r.outcome === 'escalated_to_ops');
    for (const r of done) r.outcome = 'refunded';
    if (done.length)
      log.add(inc.id, a.atSec, 'REFUND_ISSUED', 'ops',
        `Refund issued for ${plural(done.length, 'order')} (${inr(done.reduce((s, r) => s + r.order.amountInr, 0))})`,
        { orderIds: done.map((r) => r.order.orderId) });
    maybeClose(inc, a.atSec, log);
  }
}

export type { Meal };