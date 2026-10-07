import type { IncidentEvent } from '@/lib/types';
import { Card } from './ui';

const STAGES = [
  { key: 'detect', label: 'Detect', types: ['DETECTED', 'INCIDENT_CREATED'] },
  { key: 'impact', label: 'Impact', types: ['IMPACT_COMPUTED'] },
  { key: 'match', label: 'Match backup', types: ['BACKUP_PROPOSED'] },
  { key: 'approve', label: 'Ops approval', types: ['OPS_APPROVED'] },
  { key: 'reassign', label: 'Reassign', types: ['ORDER_REASSIGNED'] },
  { key: 'notify', label: 'Notify', types: ['NOTIFICATION_SENT', 'NOTIFICATION_FAILED'] },
  { key: 'reply', label: 'Replies', types: ['SUBSCRIBER_REPLIED'] },
  { key: 'close', label: 'Close', types: ['CLOSED'] },
] as const;

export default function WorkflowView({ events }: { events: IncidentEvent[] }) {
  const nodes = STAGES.map((s) => ({
    ...s,
    count: events.filter((e) => (s.types as readonly string[]).includes(e.type)).length,
  }));
  const escalations = events.filter((e) => e.type === 'ESCALATED').length;
  const firstPending = nodes.findIndex((n) => n.count === 0);

  return (
    <Card
      title="Workflow"
      right={<span className="text-xs text-slate-400">Prototype view · production orchestration in n8n</span>}
    >
      <div className="flex items-center overflow-x-auto pb-1">
        {nodes.map((n, idx) => {
          const done = n.count > 0;
          const current = idx === firstPending;
          return (
            <div key={n.key} className="flex items-center">
              <div
                className={`flex min-w-[92px] flex-col items-center rounded-lg border px-3 py-2 text-center ${
                  done
                    ? 'border-green-300 bg-green-50'
                    : current
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className={`text-xs font-medium ${done ? 'text-green-800' : current ? 'text-blue-800' : 'text-slate-400'}`}>
                  {n.label}
                </span>
                <span className="text-[11px] text-slate-500">{done ? `${n.count} event${n.count > 1 ? 's' : ''}` : current ? 'next' : 'waiting'}</span>
              </div>
              {idx < nodes.length - 1 && (
                <span className={`mx-1 h-px w-4 ${done ? 'bg-green-400' : 'bg-slate-300'}`} />
              )}
            </div>
          );
        })}
      </div>
      {escalations > 0 && (
        <p className="mt-2 text-xs text-red-700">
          {escalations} escalation{escalations > 1 ? 's' : ''} raised to Ops (see timeline).
        </p>
      )}
    </Card>
  );
}