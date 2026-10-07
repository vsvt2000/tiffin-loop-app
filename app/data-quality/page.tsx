'use client';

import { useEffect, useState } from 'react';
import type { DataQualityPayload } from '@/lib/types';
import { Badge, Card } from '@/components/ops/ui';

type Ex = DataQualityPayload['categories'][number]['examples'];

function Examples({ rows }: { rows: Ex }) {
  return (
    <table className="mt-2 w-full text-left text-xs">
      <thead className="text-slate-500">
        <tr><th>Record</th><th>Field</th><th>Raw value</th><th>Cleaned</th></tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-slate-100">
            <td className="py-1 font-mono">{r.recordId}</td>
            <td>{r.field}</td>
            <td className="font-mono text-red-700">{r.raw || '(empty)'}</td>
            <td className="font-mono text-green-700">{r.cleaned || '(none)'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DataQualityPage() {
  const [d, setD] = useState<DataQualityPayload | null>(null);
  useEffect(() => { fetch('/api/data-quality').then((r) => r.json()).then(setD); }, []);
  if (!d) return <main className="p-8 text-sm text-slate-500">Loading…</main>;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Data quality report</h1>
            <p className="text-xs text-slate-500">
              Every fix below is applied in code at load time. Source files are unmodified.
            </p>
          </div>
          <nav className="flex gap-3 text-sm">
            <a className="text-slate-600 hover:text-slate-900" href="/ops">Ops console</a>
            <a className="text-slate-600 hover:text-slate-900" href="/leadership">Leadership</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        <Card title="Resolved automatically">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-1">Issue</th><th className="text-right">Records</th><th className="pl-4">How it was handled</th></tr>
            </thead>
            <tbody>
              {d.categories.map((c) => (
                <tr key={c.category} className="border-t border-slate-100 align-top">
                  <td className="py-2">
                    <details>
                      <summary className="cursor-pointer font-medium text-slate-800">{c.label}</summary>
                      <Examples rows={c.examples} />
                    </details>
                  </td>
                  <td className="py-2 text-right">{c.count}</td>
                  <td className="py-2 pl-4 text-slate-600">{c.resolution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Needs a human" right={<Badge tone="amber">Not auto-resolved</Badge>}>
          <ul className="space-y-3">
            {d.needsHuman.map((n) => (
              <li key={n.category}>
                <p className="text-sm font-medium text-slate-800">
                  {n.label} <span className="text-slate-400">({n.count})</span>
                </p>
                <p className="text-xs text-slate-600">{n.note}</p>
                <details>
                  <summary className="cursor-pointer text-xs text-blue-700">Examples</summary>
                  <Examples rows={n.examples} />
                </details>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}