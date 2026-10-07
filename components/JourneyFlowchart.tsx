// components/JourneyFlowchart.tsx
'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'indigo';

const box: Record<Tone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-950',
  green: 'border-green-200 bg-green-50 text-green-950',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  red: 'border-red-200 bg-red-50 text-red-950',
  slate: 'border-slate-200 bg-white text-slate-900',
  indigo: 'border-indigo-300 bg-indigo-50 text-indigo-950',
};
const chip: Record<Tone, string> = {
  blue: 'bg-blue-600 text-white',
  green: 'bg-green-600 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-600 text-white',
  slate: 'bg-slate-600 text-white',
  indigo: 'bg-indigo-600 text-white',
};

function Node({ tone = 'slate', title, children, end }: { tone?: Tone; title: string; children?: ReactNode; end?: string }) {
  return (
    <div className={`h-full rounded-xl border p-3.5 shadow-sm ${box[tone]}`}>
      {end && <span className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${chip[tone]}`}>{end}</span>}
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-xs leading-relaxed opacity-90">{children}</div>}
    </div>
  );
}

function Down({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1.5" aria-hidden="true">
      {label && <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>}
      <span className="h-4 w-px bg-slate-300" />
      <svg viewBox="0 0 10 6" className="h-1.5 w-2.5 text-slate-400" fill="currentColor"><path d="M0 0h10L5 6z" /></svg>
    </div>
  );
}

function Decision({ question, hint }: { question: string; hint?: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-center">
      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Decision</span>
      <p className="mt-1.5 text-sm font-semibold text-indigo-950">{question}</p>
      {hint && <p className="mt-0.5 text-xs text-indigo-900/80">{hint}</p>}
    </div>
  );
}

function Branch({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span aria-hidden="true">↓</span>{label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Stage({ n, title, sub, children }: { n: number; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{n}</span>
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/* ---------------- Tab 1: the subscriber's experience ---------------- */
function SubscriberJourney() {
  const moments: { time: string; title: string; body: string; tone: Tone }[] = [
    { time: 'Normal day', title: 'Your meal comes from your usual cook', body: 'Nothing to do. The tool is only involved when something goes wrong.', tone: 'slate' },
    { time: 'Before mealtime', title: 'Your cook cannot cook today', body: 'Fever, family emergency, no-show. You do not know yet, and with the old process you would find out when the meal does not arrive.', tone: 'red' },
    { time: 'Within minutes', title: 'The system spots it and finds a cook', body: 'It reads the ops chat and the cook sheet, finds your order and checks for a backup that matches your city, diet and cuisine.', tone: 'blue' },
    { time: 'Before lunch or dinner', title: 'You get one clear message', body: 'It names the new cook, the meal, the delivery time and why. It tells you to reply 1 to confirm or 2 to change or get a refund.', tone: 'green' },
    { time: 'Your choice', title: 'You confirm, change or stay silent', body: 'Confirm, ask for another option, or do nothing. What happens next depends on the type of backup (see the flowchart).', tone: 'amber' },
    { time: 'Mealtime', title: 'Your meal arrives, or you are refunded', body: 'If no suitable cook exists, Ops steps in with a manual arrangement, a call or a refund. Nobody is left without an answer.', tone: 'green' },
  ];
  return (
    <div>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">The clock that matters</p>
        <div className="mt-3 flex items-center text-xs">
          <div className="flex flex-col items-center"><span className="h-3 w-3 rounded-full bg-red-500" /><span className="mt-1 font-semibold text-slate-800">10:30 AM</span><span className="text-slate-500">dropout detected</span></div>
          <div className="mx-2 h-1 flex-1 rounded bg-gradient-to-r from-red-400 to-amber-400" />
          <div className="flex flex-col items-center"><span className="h-3 w-3 rounded-full bg-amber-500" /><span className="mt-1 font-semibold text-slate-800">12:30 PM</span><span className="text-slate-500">lunch, 2h away</span></div>
          <div className="mx-2 h-1 flex-1 rounded bg-gradient-to-r from-amber-400 to-green-400" />
          <div className="flex flex-col items-center"><span className="h-3 w-3 rounded-full bg-green-500" /><span className="mt-1 font-semibold text-slate-800">7:30 PM</span><span className="text-slate-500">dinner, 9h away</span></div>
        </div>
        <p className="mt-3 text-xs text-slate-600">Lunch orders are matched first because they have the earliest deadline.</p>
      </div>

      <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
        {moments.map((m) => (
          <li key={m.title} className="relative">
            <span className={`absolute -left-[33px] top-3 h-4 w-4 rounded-full border-2 border-white ${chip[m.tone]}`} />
            <div className={`rounded-xl border p-4 ${box[m.tone]}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{m.time}</p>
              <p className="mt-0.5 font-semibold">{m.title}</p>
              <p className="mt-1 text-sm leading-relaxed opacity-90">{m.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">What the message always contains</p>
        <ul className="mt-2 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
          {['The new cook’s name', 'Which meal and the delivery time', 'Why it changed (the usual cook is unavailable)', 'What changes: nothing for an exact match, the cuisine for a relaxed one', 'How to reply: 1 to confirm, 2 for another option or a refund', 'What happens if you do not reply'].map((t) => (
            <li key={t} className="flex gap-2"><span className="text-green-600" aria-hidden="true">✓</span>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Tab 2: the full system flowchart ---------------- */
function SystemFlow() {
  return (
    <div className="space-y-4">
      <Stage n={1} title="Detect the dropout" sub="Two independent sources. Either one can start an incident.">
        <div className="grid gap-3 md:grid-cols-2">
          <Node tone="blue" title="Ops WhatsApp group message">Read by an AI classifier (with a rules fallback). It understands English, Hindi and Hinglish, nicknames like “Lakshmi aunty” and meals mentioned.</Node>
          <Node tone="blue" title="Cook sheet">A cook marked on leave or inactive who still holds open orders today. This catches dropouts nobody reported.</Node>
        </div>
        <Down />
        <Decision question="What kind of message is it?" hint="A cook name is matched by code, never guessed by the AI." />
        <Down />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Branch label="Cook cannot cook today"><Node tone="green" title="Create incident">Merged with any sheet signal into one incident per cook per day. Meal not stated means both meals.</Node></Branch>
          <Branch label="Dropout or delay for tomorrow"><Node title="Logged as a notice">No incident today. Shown under “Not incidents today”.</Node></Branch>
          <Branch label="Running late today or tomorrow"><Node title="Delay notice">Flagged for Ops. No customer impact is assumed.</Node></Branch>
          <Branch label="Customer complaint"><Node title="Routed to Ops">For example a duplicate subscriber getting two reminders.</Node></Branch>
          <Branch label="Cook name unclear or ambiguous"><Node tone="amber" title="Needs review">No incident is created automatically. Ops confirms who it is.</Node></Branch>
          <Branch label="Chatter or “all on track”"><Node title="Ignored">General messages are not incidents.</Node></Branch>
        </div>
      </Stage>

      <Stage n={2} title="Find who is affected" sub="Every open order for the dropped cook, for the affected meals.">
        <Decision question="Does the cook have open orders today?" />
        <Down />
        <div className="grid gap-3 md:grid-cols-2">
          <Branch label="No"><Node tone="green" end="End: closed" title="No customer impact">Logged and closed. Nothing to reassign.</Node></Branch>
          <Branch label="Yes"><Node tone="blue" title="List every affected subscriber">Subscriber, order, meal, diet, cuisine and amount, with flags for no phone, duplicate record or paused plan.</Node></Branch>
        </div>
      </Stage>

      <Stage n={3} title="Find a backup, order by order" sub="Each order is matched on its own. Lunch first, then longest-tenured subscriber.">
        <Node title="Hard filters every backup must pass">
          Same city · active · serves the subscriber’s diet (Veg, Non-Veg, Jain) · has free capacity (daily limit minus today’s orders minus slots already promised) · fewer than 3 dropouts in 30 days · not a cook who is out today.
        </Node>
        <Down />
        <Decision question="Which kind of backup exists for this order?" hint="Ranked by fewest recent dropouts, then most free slots, then longest tenure." />
        <Down />
        <div className="grid gap-3 md:grid-cols-3">
          <Branch label="Same cuisine"><Node tone="green" title="Tier 1: exact match">Proposed as is. The subscriber gets the same kind of food.</Node></Branch>
          <Branch label="Only another cuisine"><Node tone="amber" title="Tier 2: relaxed match">Needs the subscriber’s consent because the cuisine changes.</Node></Branch>
          <Branch label="Nobody eligible"><Node tone="red" title="Uncovered">No automatic message. Goes to Ops with the refund amount at risk.</Node></Branch>
        </div>
        <p className="mt-3 text-xs text-slate-600">A shared capacity ledger covers all incidents, so one backup can never be double-booked. In the demo data, Bengaluru has 18 orders but one exact-match cook with 8 free slots, so 10 go to the relaxed tier.</p>
      </Stage>

      <Stage n={4} title="Ops approves" sub="Human in the loop, without slowing the easy case.">
        <Decision question="Is this a clean case?" hint="Clean means every order has an exact match and nothing is flagged." />
        <Down />
        <div className="grid gap-3 md:grid-cols-2">
          <Branch label="Yes"><Node tone="green" title="One-click approve">Example: the Mumbai incident, 6 of 6 exact matches.</Node></Branch>
          <Branch label="No"><Node tone="amber" title="Reviewed approval with reasons">Shown when there are relaxed matches, uncovered orders, a subscriber with no phone, duplicate records, low detection confidence or a paused plan.</Node></Branch>
        </div>
      </Stage>

      <Stage n={5} title="Notify each subscriber" sub="One message per person. Every message shows its status.">
        <Decision question="What is true for this subscriber?" />
        <Down />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Branch label="No phone number"><Node tone="red" title="Failed, manual call">The failure is visible and Ops gets a task. Nothing is silently dropped.</Node></Branch>
          <Branch label="Two records, one person"><Node title="One combined message">The second record is logged as merged, so the person is not messaged twice.</Node></Branch>
          <Branch label="Exact match"><Node tone="blue" title="Message sent">Meal goes ahead as planned unless they reply 2.</Node></Branch>
          <Branch label="Relaxed match"><Node tone="amber" title="Consent requested">The meal is not sent unless they accept the new cuisine.</Node></Branch>
        </div>
      </Stage>

      <Stage n={6} title="The subscriber responds" sub="Each path ends in a clear outcome. Rejections are limited to two attempts.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">After an exact-match message</p>
            <div className="space-y-2">
              <Node tone="green" end="Resolved" title="No reply">Accepted by default. The meal goes ahead and the order is marked notified.</Node>
              <Node tone="green" end="Resolved" title="Reply 1">Confirmed.</Node>
              <Node tone="indigo" title="Reply 2: re-match this order">The rejected cook is excluded and the next best cook is tried. A new message is sent.</Node>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">After a relaxed-match request</p>
            <div className="space-y-2">
              <Node tone="green" end="Resolved" title="Reply 1">Consent given. The order is reassigned.</Node>
              <Node tone="indigo" title="Reply 2: re-match this order">Same re-match as the other path.</Node>
              <Node tone="red" end="Escalated" title="No reply">Not accepted, because there is no default consent. Goes to Ops.</Node>
            </div>
          </div>
        </div>
        <Down />
        <Decision question="Re-match: is another cook available, and is this the first rejection?" />
        <Down />
        <div className="grid gap-3 md:grid-cols-2">
          <Branch label="Yes"><Node tone="blue" title="Second attempt">New backup proposed and the subscriber is notified again. Capacity is reserved.</Node></Branch>
          <Branch label="No cook left, or rejected twice"><Node tone="red" end="Escalated" title="Sent to Ops">With the refund or credit option and the amount at stake.</Node></Branch>
        </div>
      </Stage>

      <Stage n={7} title="Ops handles escalations" sub="Anything automation cannot resolve lands here, never in silence.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Node tone="red" title="Uncovered orders">No eligible backup.</Node>
          <Node tone="red" title="Unreachable subscribers">No phone number.</Node>
          <Node tone="red" title="Rejections and no-replies">Attempt limit reached, or consent never given.</Node>
        </div>
        <Down />
        <div className="grid gap-3 md:grid-cols-2">
          <Node tone="blue" title="Ops decides">Find a cook manually, call the subscriber, or offer a refund or credit.</Node>
          <Node tone="green" end="Resolved" title="Refund recorded">Logged in the incident timeline once issued.</Node>
        </div>
      </Stage>

      <Stage n={8} title="Close, with a full record" sub="An incident never closes just because the reassignment happened.">
        <Decision question="Does every order have a final outcome, and none is waiting on Ops?" />
        <Down />
        <div className="grid gap-3 md:grid-cols-3">
          <Branch label="Yes"><Node tone="green" end="Closed" title="Incident closed">Every subscriber has a known resolution and has been informed.</Node></Branch>
          <Branch label="Some orders await consent or replies"><Node tone="blue" title="Stays open: notified">The workflow shows what is still pending.</Node></Branch>
          <Branch label="Some orders waiting on Ops"><Node tone="red" title="Stays open: escalated">Closes only after Ops resolves each one.</Node></Branch>
        </div>
        <p className="mt-3 text-xs text-slate-600">Every step above writes to an append-only timeline: detected, impact computed, backups proposed, approved, reassigned, notified, replied, escalated, closed.</p>
      </Stage>
    </div>
  );
}

/* ---------------- Tab 3: every outcome in one table ---------------- */
const OUTCOMES: { case: string; hears: string; end: string; tone: Tone }[] = [
  { case: 'Exact-match backup, subscriber does not reply', hears: 'Message naming the new cook. Meal goes ahead as planned.', end: 'Resolved (accepted by default)', tone: 'green' },
  { case: 'Exact-match backup, replies 1', hears: 'Message, then confirmation recorded.', end: 'Resolved (confirmed)', tone: 'green' },
  { case: 'Exact-match backup, replies 2', hears: 'A second message with a new cook, if one exists.', end: 'Second attempt, then Ops if rejected again', tone: 'amber' },
  { case: 'Relaxed (different cuisine) backup, replies 1', hears: 'Message explaining the cuisine change.', end: 'Resolved (consent given)', tone: 'green' },
  { case: 'Relaxed backup, replies 2', hears: 'A second proposal, if one exists.', end: 'Second attempt, then Ops', tone: 'amber' },
  { case: 'Relaxed backup, no reply', hears: 'Message asking for consent. Meal is not sent without it.', end: 'Escalated to Ops', tone: 'red' },
  { case: 'No eligible backup', hears: 'No automatic message. Ops contacts them with an arrangement or refund.', end: 'Escalated, then refunded or arranged by Ops', tone: 'red' },
  { case: 'No phone number', hears: 'Nothing can be sent. Ops gets a manual-call task.', end: 'Escalated to Ops', tone: 'red' },
  { case: 'Two records for one person', hears: 'One combined message, not two.', end: 'Follows the path of the backup type', tone: 'slate' },
  { case: 'Cook has no open orders', hears: 'No message needed.', end: 'Closed: no customer impact', tone: 'green' },
];

function Outcomes() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-2.5">Situation</th><th className="px-4">What the subscriber hears</th><th className="px-4">Where it ends</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {OUTCOMES.map((o) => (
            <tr key={o.case} className="align-top">
              <td className="px-4 py-3 font-medium text-slate-900">{o.case}</td>
              <td className="px-4 py-3 text-slate-600">{o.hears}</td>
              <td className="px-4 py-3"><span className={`inline-block rounded-lg border px-2 py-1 text-xs font-medium ${box[o.tone]}`}>{o.end}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Component ---------------- */
const TABS = [
  { id: 'journey', label: 'Subscriber journey' },
  { id: 'flow', label: 'System flowchart' },
  { id: 'outcomes', label: 'All outcomes' },
] as const;

export default function JourneyFlowchart() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('journey');

  return (
    <main className="min-h-screen">
      {/* <header className="border-b border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-slate-900">← TiffinLoop Dropout Response</Link>
          <nav className="flex gap-3 text-sm">
            <Link href="/ops" className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700">Ops console</Link>
            <Link href="/leadership" className="px-2 py-1.5 text-slate-600 hover:text-slate-900">Leadership</Link>
          </nav>
        </div>
      </header> */}

      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="mt-2 max-w-2xl text-slate-600">
          Start with what a subscriber experiences, then see each decision the tool makes behind the scenes and every way an order can end.
        </p>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600" aria-label="Colour key">
          {([['blue', 'System step'], ['indigo', 'Decision'], ['green', 'Resolved'], ['amber', 'Needs consent or review'], ['red', 'Escalated to Ops']] as [Tone, string][]).map(([t, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${chip[t]}`} />{l}</span>
          ))}
        </div>

        <div role="tablist" aria-label="Views" className="mt-6 inline-flex rounded-xl bg-slate-200/70 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="mt-6">
          {tab === 'journey' && <SubscriberJourney />}
          {tab === 'flow' && <SystemFlow />}
          {tab === 'outcomes' && <Outcomes />}
        </div>
      </div>
    </main>
  );
}