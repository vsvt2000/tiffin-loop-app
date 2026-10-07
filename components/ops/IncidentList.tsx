import type { Incident, ScheduledNotice } from '@/lib/types';
import { Badge, mins, stateTone } from './ui';

interface Props {
  incidents: Incident[];
  notices: ScheduledNotice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function IncidentList({ incidents, notices, selectedId, onSelect }: Props) {
  return (
    <aside className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Open incidents ({incidents.length})
      </h2>

      {incidents.map((i) => {
        const nextMeal = i.meals.map((m) => ({ m, t: i.minutesToMeal[m] })).sort(
          (a, b) => (a.t ?? 9999) - (b.t ?? 9999),
        )[0];
        const covered = i.assignments.length;
        const total = i.affected.length;
        const active = i.id === selectedId;

        return (
          <button
            key={i.id}
            onClick={() => onSelect(i.id)}
            className={`w-full rounded-lg border bg-white p-3 text-left transition ${
              active ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">{i.id}</p>
                <p className="font-medium text-slate-900">{i.cookName}</p>
                <p className="text-xs text-slate-500">{i.city} · {i.cuisine}</p>
              </div>
              <Badge tone={stateTone(i.state)}>{i.state}</Badge>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <Badge>{total} affected</Badge>
              <Badge tone={i.uncovered.length ? 'red' : 'green'}>
                {covered}/{total} proposed
              </Badge>
              {nextMeal?.t !== undefined && (
                <Badge tone={nextMeal.t < 150 ? 'amber' : 'slate'}>
                  {nextMeal.m} in {mins(nextMeal.t)}
                </Badge>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Detected via {i.sources.join(' + ')}
            </p>
          </button>
        );
      })}

      {notices.length > 0 && (
        <div className="pt-2">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Not incidents today
          </h2>
          {notices.map((n) => (
            <div key={n.id} className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="font-medium text-slate-700">{n.sender}</p>
              <p className="mt-0.5 text-slate-600">“{n.text}”</p>
              <p className="mt-1 text-slate-500">{n.note}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}