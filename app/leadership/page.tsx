'use client';

import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { LeadershipPayload } from '@/lib/types';
import { Badge, Card } from '@/components/ops/ui';
import LeadershipInsights from '@/components/LeadershipInsights';

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function LeadershipPage() {
  const [d, setD] = useState<LeadershipPayload | null>(null);
  const [insight, setInsight] = useState<{ text: string; source: string } | null>(null);

  useEffect(() => {
    fetch('/api/leadership').then((r) => r.json()).then(setD);
    fetch('/api/insight').then((r) => r.json()).then(setInsight).catch(() => setInsight(null));
  }, []);

  if (!d) return <main className="p-8 text-sm text-slate-500">Loading…</main>;

  const top = d.byCook.slice(0, 10).map((c) => ({ ...c, label: `${c.name} (${c.city})` }));

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Cook dropouts · last 30 days</h1>
            <p className="text-xs text-slate-500">{d.window.start} to {d.window.end}</p>
          </div>
          <nav className="flex gap-3 text-sm">
            <a className="text-slate-600 hover:text-slate-900" href="/ops">Ops console</a>
            <a className="text-slate-600 hover:text-slate-900" href="/data-quality">Data quality</a>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        <LeadershipInsights/>
      </div>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        {insight && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            {insight.text}
            <span className="ml-2 text-[11px] text-blue-600">
              {insight.source === 'gemini' ? 'AI summary of the figures below' : 'Auto summary'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Dropout events" value={d.kpis.events} />
          <Kpi label="Cooks with any dropout" value={d.kpis.cooksWithEvents} />
          <Kpi label="Repeat offenders (3+)" value={d.kpis.repeatOffenders} />
          <Kpi label="Top 2 cooks' share" value={`${d.kpis.topTwoShare}%`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="By city">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={d.byCity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="city" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="events" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="mt-3 w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr><th>City</th><th className="text-right">Events</th><th className="text-right">Active cooks</th><th className="text-right">Events per cook</th></tr>
              </thead>
              <tbody>
                {d.byCity.map((c) => (
                  <tr key={c.city} className="border-t border-slate-100">
                    <td className="py-1">{c.city}</td>
                    <td className="text-right">{c.events}</td>
                    <td className="text-right">{c.activeCooks}</td>
                    <td className="text-right">{c.perCook}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="By cook (top 10)">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={top} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="events" radius={[0, 4, 4, 0]}>
                    {top.map((c) => (
                      <Cell key={c.cookId} fill={c.stillActiveRisk ? '#dc2626' : '#2563eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <Badge tone="red">Red</Badge> = 3+ events and still marked active in the cook sheet.
            </p>
          </Card>
        </div>

        <Card title="Daily trend">
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={d.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" fill="#64748b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <p className="text-xs text-slate-500">
          <strong>Definition:</strong> {d.definition}
        </p>
      </div>
    </main>
  );
}