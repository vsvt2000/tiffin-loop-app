import type { Incident } from '@/lib/types';
import { Badge, Card, inr } from './ui';

interface Props {
  incident: Incident;
  busy: boolean;
  onAction: (path: string, body?: unknown) => Promise<void>;
}

const reasonText = {
  no_capacity: 'No eligible cook has free capacity',
  diet_mismatch: 'No eligible cook serves this diet',
  no_cook_in_city: 'No active cook in this city',
} as const;

export default function ProposalPanel({ incident: i, busy, onAction }: Props) {
  const byCook = new Map<string, typeof i.assignments>();
  for (const a of i.assignments) {
    const list = byCook.get(a.backupCookId) ?? [];
    list.push(a);
    byCook.set(a.backupCookId, list);
  }

  const total = i.affected.length;
  const exposure = i.uncovered.reduce((s, u) => s + u.amountInr, 0);
  const canApprove = i.state === 'PROPOSED';
  const tier2 = i.assignments.filter((a) => a.tier === 2).length;
  const tier1 = i.assignments.length - tier2;

  return (
    <Card
      title="Recommended resolution"
      right={
        <div className="flex gap-1.5">
          <Badge tone="green">{tier1} exact match</Badge>
          {tier2 > 0 && <Badge tone="amber">{tier2} relaxed (needs consent)</Badge>}
          {i.uncovered.length > 0 && <Badge tone="red">{i.uncovered.length} uncovered</Badge>}
        </div>
      }
    >
      {i.requiresApproval && i.approvalReasons.length > 0 && (
        <div className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Manual review required</p>
          <ul className="mt-1 list-disc pl-5">
            {i.approvalReasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      {[...byCook.entries()].map(([cookId, list]) => (
        <div key={cookId} className="mb-3 rounded-md border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-900">
              {list[0].backupCookName}
              <span className="ml-1 text-xs text-slate-400">{cookId}</span>
            </p>
            <Badge tone={list[0].tier === 1 ? 'green' : 'amber'}>
              Tier {list[0].tier} · {list.length} order{list.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            {list[0].reasons.map((r) => <li key={r}>✓ {r}</li>)}
          </ul>
          <p className="mt-2 text-xs text-slate-600">
            {list.map((a) => `${a.subscriberName} (${a.meal})`).join(', ')}
          </p>
        </div>
      ))}

      {i.uncovered.length > 0 && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            {i.uncovered.length} subscriber{i.uncovered.length > 1 ? 's' : ''} uncovered · {inr(exposure)} refund exposure
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-red-700">
            {i.uncovered.map((u) => (
              <li key={u.orderId}>
                {u.subscriberName} ({u.meal}): {reasonText[u.reason]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-slate-600">
        Coverage: <strong>{i.assignments.length}/{total}</strong>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={!canApprove || busy}
          onClick={() => onAction(`/api/incidents/${i.id}/approve`)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {i.requiresApproval ? 'Approve with exceptions' : 'Approve and notify'}
        </button>
        {!canApprove && (
          <span className="self-center text-xs text-slate-500">
            {i.state === 'CLOSED' ? 'Incident closed.' : 'Already actioned.'}
          </span>
        )}
      </div>
    </Card>
  );
}