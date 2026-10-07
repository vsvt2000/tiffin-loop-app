import type { IncidentEvent } from '@/lib/types';
import { clock } from './ui';

const actorStyle: Record<IncidentEvent['actor'], string> = {
  system: 'bg-slate-100 text-slate-600',
  ops: 'bg-blue-100 text-blue-700',
  subscriber: 'bg-green-100 text-green-700',
  gemini: 'bg-purple-100 text-purple-700',
};

export default function Timeline({ events }: { events: IncidentEvent[] }) {
  if (!events.length) return <p className="text-sm text-slate-500">No events yet.</p>;

  return (
    <ol className="space-y-1.5">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 text-sm">
          <span className="w-16 shrink-0 font-mono text-xs text-slate-400">{clock(e.at)}</span>
          <span className={`w-20 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-medium uppercase ${actorStyle[e.actor]}`}>
            {e.actor}
          </span>
          <span className="text-slate-700">{e.summary}</span>
        </li>
      ))}
    </ol>
  );
}