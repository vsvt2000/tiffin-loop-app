import type { Incident } from '@/lib/types';
import { Badge, Card, inr, mins, stateTone } from './ui';
import ImpactTable from './ImpactTable';
import ProposalPanel from './ProposalPanel';
import NotificationPanel from './NotificationPanel';
import Timeline from './Timeline';
import WorkflowView from './WorkflowView';

interface Props {
  incident: Incident;
  busy: boolean;
  onAction: (path: string, body?: unknown) => Promise<void>;
}

export default function IncidentDetail({ incident: i, busy, onAction }: Props) {
  const atRisk = i.affected.reduce((s, o) => s + o.amountInr, 0);

  return (
    <div className="space-y-4">
      <Card
        title={`${i.id} · ${i.cookName} (${i.city})`}
        right={<Badge tone={stateTone(i.state)}>{i.state}</Badge>}
      >
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-slate-500">Cuisine</dt><dd>{i.cuisine}</dd></div>
          <div><dt className="text-xs text-slate-500">Reason</dt><dd>{i.reason ?? 'Not stated'}</dd></div>
          <div><dt className="text-xs text-slate-500">Orders affected</dt><dd>{i.affected.length}</dd></div>
          <div><dt className="text-xs text-slate-500">Order value at risk</dt><dd>{inr(atRisk)}</dd></div>
          {i.meals.map((m) => (
            <div key={m}>
              <dt className="text-xs text-slate-500 capitalize">{m} deadline</dt>
              <dd>{mins(i.minutesToMeal[m])}</dd>
            </div>
          ))}
        </dl>
        {i.originalMessage && (
          <blockquote className="mt-3 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-600">
            {i.originalMessage}
          </blockquote>
        )}
      </Card>

      <WorkflowView events={i.events} />

      <Card title={`Affected subscribers (${i.affected.length})`}>
        <ImpactTable orders={i.affected} />
      </Card>

      <ProposalPanel incident={i} busy={busy} onAction={onAction} />

      <NotificationPanel incident={i} busy={busy} onAction={onAction} />

      <Card title="Incident timeline">
        <Timeline events={i.events} />
      </Card>
    </div>
  );
}