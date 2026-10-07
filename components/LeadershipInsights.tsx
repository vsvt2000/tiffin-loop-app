'use client';

import { useState } from 'react';

type Insight = {
  title: string;
  severity: 'high' | 'medium' | 'low';
  finding: string;
  evidence: string[];
  whyItMatters: string;
  action: string;
  origin: 'ai' | 'rule';
};
type Payload = {
  source: 'gemini' | 'fallback';
  model: string | null;
  basedOn: string;
  note: string | null;
  insights: Insight[];
};

const SEVERITY = {
  high: { label: 'High priority', bar: 'border-l-red-500', badge: 'bg-red-100 text-red-800 ring-red-200' },
  medium: { label: 'Medium', bar: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-800 ring-amber-200' },
  low: { label: 'Low', bar: 'border-l-slate-400', badge: 'bg-slate-100 text-slate-700 ring-slate-200' },
} as const;

function Spark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z" />
    </svg>
  );
}

export default function LeadershipInsights() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [data, setData] = useState<Payload | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(refresh: boolean) {
    setState('loading');
    setCopied(false);
    try {
      const res = await fetch('/api/leadership/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as Payload);
      setState('done');
    } catch {
      setState('error');
    }
  }

  async function copy() {
    if (!data) return;
    const text = data.insights
      .map((i, n) => `${n + 1}. [${SEVERITY[i.severity].label}] ${i.title}\n${i.finding}\nWhy it matters: ${i.whyItMatters}\nAction: ${i.action}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(`Leadership insights (${data.basedOn})\n\n${text}`);
      setCopied(true);
    } catch { /* clipboard blocked: ignore */ }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="insights-title">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 id="insights-title" className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white"><Spark /></span>
            AI insights for leadership
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Reads the last 30 days of dropout data and explains what matters and what to do. Every figure is checked against the data.
          </p>
        </div>
        {state !== 'loading' && (
          <div className="flex shrink-0 gap-2">
            {state === 'done' && (
              <>
                <button onClick={copy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => run(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Regenerate
                </button>
              </>
            )}
            {state !== 'done' && (
              <button
                onClick={() => run(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700"
              >
                <Spark /> {state === 'error' ? 'Try again' : 'Generate insights'}
              </button>
            )}
          </div>
        )}
      </div>

      <div aria-live="polite" className="p-4 sm:p-5">
        {state === 'idle' && (
          <p className="text-sm text-slate-500">Press <strong>Generate insights</strong> to analyse the data. It takes a few seconds.</p>
        )}

        {state === 'loading' && (
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm text-slate-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              Analysing 30 days of dropout data…
            </p>
            <div className="space-y-3">
              {[0, 1, 2].map((n) => (
                <div key={n} className="animate-pulse rounded-xl border border-slate-100 p-4">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-5/6 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        )}

        {state === 'error' && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Could not generate insights. Check your connection and try again.</p>
        )}

        {state === 'done' && data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${data.source === 'gemini' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                {data.source === 'gemini' ? `AI · ${data.model}` : 'Rule-based'}
              </span>
              <span>Based on {data.basedOn}</span>
            </div>
            {data.note && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">{data.note}</p>}

            <ol className="space-y-3">
              {data.insights.map((i, n) => (
                <li key={i.title} className={`rounded-xl border border-l-4 border-slate-200 bg-white p-4 ${SEVERITY[i.severity].bar}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">{n + 1}</span>
                    <h3 className="font-semibold text-slate-900">{i.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${SEVERITY[i.severity].badge}`}>{SEVERITY[i.severity].label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{i.origin === 'ai' ? 'AI' : 'Rule'}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-800">{i.finding}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {i.evidence.map((e) => (
                      <li key={e} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 tabular">{e}</li>
                    ))}
                  </ul>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Why it matters</p>
                      <p className="mt-0.5 text-sm text-slate-700">{i.whyItMatters}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Suggested action</p>
                      <p className="mt-0.5 text-sm text-blue-950">{i.action}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}