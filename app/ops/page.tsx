'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OpsPayload } from '@/lib/types';
import IncidentDetail from '@/components/ops/IncidentDetail';
import IncidentList from '@/components/ops/IncidentList';

export default function OpsPage() {
  const [data, setData] = useState<OpsPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const json: OpsPayload = await res.json();
      setData(json);
      setSelectedId((prev) => prev ?? json.incidents[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = useCallback(async (path: string, body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`Action failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const selected = data?.incidents.find((i) => i.id === selectedId) ?? null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">TiffinLoop Ops Console</h1>
            <p className="text-xs text-slate-500">
              {data
                ? `Simulated time: ${new Date(data.meta.now).toLocaleString('en-IN', {
                    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
                  })} · Lunch 12:30 PM · Dinner 7:30 PM`
                : 'Loading…'}
            </p>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <a className="text-slate-600 hover:text-slate-900" href="/data-quality">Data quality</a>
            <a className="text-slate-600 hover:text-slate-900" href="/leadership">Leadership</a>
            <button
              onClick={() => act('/api/reset')}
              disabled={busy}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Reset demo
            </button>
          </nav>
        </div>
        {data?.meta.ephemeral && (
          <div className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
            Ephemeral mode: state is held in memory and may reset between requests.
          </div>
        )}
        {error && <div className="bg-red-50 px-4 py-1.5 text-center text-xs text-red-800">{error}</div>}
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[320px_1fr]">
        <IncidentList
          incidents={data?.incidents ?? []}
          notices={data?.scheduledNotices ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        {selected ? (
          <IncidentDetail incident={selected} busy={busy} onAction={act} />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {data ? 'No incident selected.' : 'Loading incidents…'}
          </p>
        )}
      </div>
    </main>
  );
}