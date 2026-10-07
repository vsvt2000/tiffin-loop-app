// lib/store.ts
import { buildWorld, type Action, type PersistedState } from './incident';
import { toOpsPayload } from './viewmodel';
import type { OpsPayload } from './types';

/*
  Optional persistence (Supabase). Run once in the SQL editor:

    create table if not exists tl_state (id text primary key, state jsonb not null);

  Env vars (server only): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
  Without them the app runs in ephemeral mode (in-memory; the UI shows a banner).

  Only the Ops actions are stored. Incidents, proposals, notifications and the
  event timeline are replayed from the seed data + actions, so the audit trail is
  reproducible and the capacity ledger can never drift.
*/

const ROW = 'default';
type G = typeof globalThis & { __tlState?: PersistedState };
const g = globalThis as G;

const url = () => process.env.SUPABASE_URL;
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const remote = () => !!url() && !!key();
const headers = () => ({
  apikey: key()!, Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json',
});

async function readState(): Promise<{ state: PersistedState; ephemeral: boolean }> {
  if (remote()) {
    try {
      const res = await fetch(`${url()}/rest/v1/tl_state?id=eq.${ROW}&select=state`, { headers: headers(), cache: 'no-store' });
      if (res.ok) {
        const rows = (await res.json()) as { state: PersistedState }[];
        return { state: rows[0]?.state ?? { actions: [] }, ephemeral: false };
      }
    } catch { /* fall through to memory */ }
  }
  return { state: g.__tlState ?? { actions: [] }, ephemeral: true };
}

async function writeState(state: PersistedState): Promise<boolean> {
  g.__tlState = state;
  if (!remote()) return false;
  try {
    const res = await fetch(`${url()}/rest/v1/tl_state`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ id: ROW, state }]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const nextAtSec = (s: PersistedState) => Math.max(120, ...s.actions.map((a) => a.atSec + 45));

export async function getOpsPayload(): Promise<OpsPayload> {
  const { state, ephemeral } = await readState();
  return toOpsPayload(buildWorld(state.actions), ephemeral);
}

async function commit(build: (atSec: number) => Action, validate?: (p: OpsPayload) => void): Promise<OpsPayload> {
  const { state, ephemeral } = await readState();
  const before = toOpsPayload(buildWorld(state.actions), ephemeral);
  validate?.(before);
  const next: PersistedState = { actions: [...state.actions, build(nextAtSec(state))] };
  const persisted = await writeState(next);
  return toOpsPayload(buildWorld(next.actions), ephemeral || !persisted);
}

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

const mustExist = (id: string) => (p: OpsPayload) => {
  if (!p.incidents.some((i) => i.id === id)) throw new NotFoundError(`Unknown incident ${id}`);
};

export function approveIncident(incidentId: string) {
  return commit((atSec) => ({ type: 'approve', incidentId, atSec }), mustExist(incidentId));
}

export function replyToOrders(incidentId: string, orderIds: string[], reply: '1' | '2' | 'timeout') {
  return commit((atSec) => ({ type: 'reply', incidentId, orderIds, reply, atSec }), (p) => {
    mustExist(incidentId)(p);
    const inc = p.incidents.find((i) => i.id === incidentId)!;
    if (inc.state === 'PROPOSED') throw new ConflictError('Approve the incident before simulating replies');
  });
}

export function refundOrders(incidentId: string, orderIds: string[]) {
  return commit((atSec) => ({ type: 'refund', incidentId, orderIds, atSec }), mustExist(incidentId));
}

export async function resetDemo(): Promise<OpsPayload> {
  const empty: PersistedState = { actions: [] };
  const persisted = await writeState(empty);
  return toOpsPayload(buildWorld([]), !persisted);
}