import type { Incident, Notification } from '@/lib/types';
import { Badge, Card, clock } from './ui';

interface Props {
  incident: Incident;
  busy: boolean;
  onAction: (path: string, body?: unknown) => Promise<void>;
}

const tone = {
  sent: 'green',
  pending_consent: 'amber',
  failed_no_phone: 'red',
  deduped: 'slate',
} as const;

const label = {
  sent: 'Sent',
  pending_consent: 'Awaiting consent',
  failed_no_phone: 'Failed: no phone',
  deduped: 'Merged into another message',
} as const;

export default function NotificationPanel({ incident: i, busy, onAction }: Props) {
  if (!i.notifications.length) {
    return (
      <Card title="Subscriber notifications">
        <p className="text-sm text-slate-500">
          Nothing sent yet. Notifications go out after approval.
        </p>
      </Card>
    );
  }

  const counts = i.notifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.status] = (acc[n.status] ?? 0) + 1;
    return acc;
  }, {});

  const canReply = (n: Notification) => n.status === 'sent' || n.status === 'pending_consent';

  return (
    <Card
      title="Subscriber notifications"
      right={
        <span className="text-xs text-slate-500">
          {counts.sent ?? 0} sent · {counts.pending_consent ?? 0} awaiting · {counts.failed_no_phone ?? 0} failed
        </span>
      }
    >
      <ul className="space-y-3">
        {i.notifications.map((n) => (
          <li key={n.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">{n.subscriberName}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{clock(n.at)}</span>
                <Badge tone={tone[n.status]}>{label[n.status]}</Badge>
              </div>
            </div>

            <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 text-sm text-slate-700">
              {n.message}
            </p>

            {n.status === 'failed_no_phone' && (
              <p className="mt-2 text-xs text-red-700">Manual call needed. Escalated to Ops.</p>
            )}

            {canReply(n) && (
              <div className="mt-2 flex gap-2">
                <span className="self-center text-xs text-slate-500">Simulate reply:</span>
                <button
                  disabled={busy}
                  onClick={() => onAction(`/api/incidents/${i.id}/reply`, { orderIds: n.orderIds, reply: '1' })}
                  className="rounded border border-green-300 px-2 py-1 text-xs text-green-800 hover:bg-green-50 disabled:opacity-50"
                >
                  1 · Confirm
                </button>
                <button
                  disabled={busy}
                  onClick={() => onAction(`/api/incidents/${i.id}/reply`, { orderIds: n.orderIds, reply: '2' })}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-800 hover:bg-red-50 disabled:opacity-50"
                >
                  2 · Reject
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}