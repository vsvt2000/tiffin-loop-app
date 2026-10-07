import type { ReactNode } from 'react';

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const mins = (m?: number) => {
  if (m === undefined) return '–';
  if (m <= 0) return 'window open';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r}m` : `${r}m`;
};

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Asia/Kolkata',
  });

const tones = {
  green: 'bg-green-100 text-green-800 ring-green-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  red: 'bg-red-100 text-red-800 ring-red-200',
  blue: 'bg-blue-100 text-blue-800 ring-blue-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
} as const;

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export const stateTone = (s: string) =>
  s === 'CLOSED' ? 'green' : s === 'ESCALATED' ? 'red' : s === 'PROPOSED' ? 'amber' : 'blue';