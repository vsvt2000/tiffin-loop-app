// app/page.tsx
import JourneyFlowchart from '@/components/JourneyFlowchart';
import Link from 'next/link';

const PIPELINE = [
  { n: 1, title: 'Detect', body: 'AI Automation reads the ops WhatsApp group and the cook sheet. Merges both into one incident per cook.' },
  { n: 2, title: 'Find who is affected', body: 'Lists every open order for that cook with the subscriber, meal, diet and amount.' },
  { n: 3, title: 'Match a backup', body: 'Same city, active, serves the diet, has free slots. Exact cuisine first, then a relaxed match.' },
  { n: 4, title: 'Ops approves or rejects', body: 'One click when it is clean. A reasoned review when it is not.' },
  { n: 5, title: 'Notify', body: 'One message per person with the new cook, meal, time and how to reply.' },
  { n: 6, title: 'Confirm and close', body: 'Replies are tracked. An incident closes only when every order has an outcome.' },
];

const HOW_TO = [
  { title: 'Open the Ops console', body: 'Three incidents are already loaded on the left. The clock is fixed at 10:30 AM, so lunch is 2 hours away.' },
  { title: 'Pick an incident', body: 'See every affected subscriber, then the recommended backup cooks and why each was chosen.' },
  { title: 'Approve or reject', body: 'Messages are simulated. Each shows its status: sent, awaiting consent, failed or merged.' },
  { title: 'Simulate replies', body: 'Press 1 to confirm or 2 to reject. Watch the re-match, the timeline and the workflow update.' },
];

const SCENARIOS = [
  { tag: 'Start here', tone: 'green', title: 'Mumbai: the clean case', body: 'Sunita Kulkarni messaged the group in Hinglish, but the sheet still shows her active. All 6 orders match an exact backup. Approve in one click.' },
  { tag: 'Conflict', tone: 'amber', title: 'Bengaluru: not enough capacity', body: 'Lakshmi Iyer and Geeta Rao are both out. 18 orders, but only one exact-match cook with 8 free slots. The other 10 are offered a different cuisine, with consent.' },
  { tag: 'Edge case', tone: 'red', title: 'A subscriber with no phone', body: 'The message fails visibly and Ops gets a manual-call task instead of a silent miss.' },
  { tag: 'Edge case', tone: 'slate', title: 'One person, two records', body: 'Tariq appears twice with the same phone. He receives one combined message, not two.' },
] as const;

const tagTone = {
  green: 'bg-green-100 text-green-800 ring-green-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  red: 'bg-red-100 text-red-800 ring-red-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
} as const;

const PRINCIPLES = [
  { title: 'AI reads, code decides', body: 'A classifier (with a rules fallback) reads the WhatsApp messages. Every assignment is plain, readable code, so it is repeatable and auditable.' },
  { title: 'Nothing is hidden', body: 'The seed data is messy. Every fix is applied in code and listed on the Data quality page, with raw and cleaned values.' },
  { title: 'Humans stay in charge', body: 'Easy cases are one click. Anything unusual needs a reviewer, and the reasons are shown.' },
  { title: 'Everything is logged', body: 'Each incident has a timeline: who was affected, what was decided and whether everyone was told.' },
];

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function CtaButtons({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <Link
        href="/ops"
        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
        target="_blank"
      >
        Open the Ops console
        <span className="transition group-hover:translate-x-0.5"><Arrow /></span>
      </Link>
      <Link
        target="_blank"
        href="/leadership"
        className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
      >
        View the leadership dashboard
        <span className="transition group-hover:translate-x-0.5"><Arrow /></span>
      </Link>
    </div>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
      {lead && <p className="mt-3 text-slate-600">{lead}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">T</span>
            <span className="text-sm font-semibold text-slate-900">TiffinLoop <span className="font-normal text-slate-500">Dropout Response</span></span>
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-3" aria-label="Primary">
            <a href="#how-it-works" className="hidden rounded-md px-2 py-1 text-slate-600 hover:text-slate-900 sm:inline">How it works</a>
            <a href="#try-it" className="hidden rounded-md px-2 py-1 text-slate-600 hover:text-slate-900 sm:inline">Try it</a>
            <Link target="_blank" href="/leadership" className="rounded-md px-2 py-1 text-slate-600 hover:text-slate-900">Leadership</Link>
            <Link target="_blank" href="/ops" className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700">Ops console</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Built on the real TiffinLoop seed data
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] text-slate-900 sm:text-5xl">
            When a cook drops out, every affected subscriber is found, covered and told{' '}
            <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">before mealtime.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Today, ops learns about a dropout when a subscriber complains, then scrambles on WhatsApp.
            This tool spots the dropout, lists who is affected, proposes backup cooks with reasons and sends each subscriber a clear message, with a full record of what happened.
          </p>
          <CtaButtons className="mt-8" />
          <p className="mt-4 text-sm text-slate-500">
            No setup needed. Opens with today&apos;s data loaded. <Link target="_blank" href="/data-quality" className="font-medium text-blue-700 underline">See how the messy data was cleaned</Link>
          </p>
        </div>

        {/* Snapshot card */}
        <aside aria-label="Snapshot of today's situation" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">The situation in the demo</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Lunch in 2h</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">23 Sep 2026 · 10:30 AM · lunch 12:30 PM · dinner 7:30 PM</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {[
              { cook: 'Lakshmi Iyer', city: 'Bengaluru', n: 9, src: 'WhatsApp + sheet' },
              { cook: 'Geeta Rao', city: 'Bengaluru', n: 9, src: 'WhatsApp + sheet' },
              { cook: 'Sunita Kulkarni', city: 'Mumbai', n: 6, src: 'WhatsApp only' },
            ].map((r) => (
              <li key={r.cook} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.cook}</p>
                  <p className="text-xs text-slate-500">{r.city} · found via {r.src}</p>
                </div>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">{r.n} orders</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
            <span className="text-sm">Subscribers to protect</span>
            <span className="text-2xl font-bold tabular">24</span>
          </div>
        </aside>
      </section>

      {/* Problem vs solution */}
      <section className="border-y border-slate-200 bg-white/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-2">
          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-700">Without the tool</p>
            <ul className="mt-3 space-y-2.5 text-slate-700">
              {['Ops finds out late, usually from an angry subscriber.', 'A scramble on WhatsApp to find a backup cook or refund.', 'Subscribers hear nothing until the meal does not arrive.', 'No record of who was told what.'].map((t) => (
                <li key={t} className="flex gap-2.5"><span aria-hidden="true" className="mt-0.5 text-red-500">✕</span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-700">With the tool</p>
            <ul className="mt-3 space-y-2.5 text-slate-700">
              {['The dropout is detected from the group chat and the cook sheet.', 'Every affected subscriber is listed with their order details.', 'Backup cooks are proposed with clear reasons and shared capacity.', 'Each subscriber is messaged, and every step is logged.'].map((t) => (
                <li key={t} className="flex gap-2.5"><span aria-hidden="true" className="mt-0.5 text-green-600">✓</span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <SectionHead eyebrow="The solution" title="From a WhatsApp message to a closed incident" lead="Six steps, each one visible on screen so Ops can see what the system did and why." />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((s) => (
            <li key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{s.n}</span>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section id="flowchart" className="mx-auto max-w-6xl px-4 py-16">
        <SectionHead eyebrow="The flow" title="How the system decides what to do" lead="A flowchart shows the logic for each step, with a clear path for every outcome." />
        <div className="mt-10 overflow-x-auto">
          <JourneyFlowchart />
        </div>
      </section>

      {/* Try it */}
      <section id="try-it" className="scroll-mt-20 border-y border-slate-200 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionHead eyebrow="How to use it" title="Try it in two minutes" lead="You need no explanation. Follow these steps, then explore the scenarios." />
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <ol className="space-y-4">
              {HOW_TO.map((s, i) => (
                <li key={s.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{s.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
                  </div>
                </li>
              ))}
              <li className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-inset ring-blue-200">
                <strong>Tip:</strong> press <em>Reset demo</em> in the Ops console at any time to start over.
              </li>
            </ol>
            <div className="grid gap-4 sm:grid-cols-2">
              {SCENARIOS.map((s) => (
                <article key={s.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
                  <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tagTone[s.tone]}`}>{s.tag}</span>
                  <h3 className="mt-2 font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Two surfaces */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <SectionHead eyebrow="Two views, two users" title="Resolve today. Spot the pattern." />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">For Ops · today</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Ops console</h3>
            <ul className="mt-3 flex-1 space-y-2 text-sm text-slate-600">
              <li>• Incidents detected from WhatsApp and the cook sheet</li>
              <li>• Every affected subscriber, with diet, meal and amount</li>
              <li>• Ranked backup cooks with reasons, plus a shared capacity ledger</li>
              <li>• Simulated notifications, replies, re-matching and escalation</li>
              <li>• A live workflow strip and an event timeline per incident</li>
            </ul>
            <Link target="_blank" href="/ops" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300">
              Open the Ops console <Arrow />
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">For leadership · last 30 days</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Leadership dashboard</h3>
            <ul className="mt-3 flex-1 space-y-2 text-sm text-slate-600">
              <li>• Dropout events by city and by cook</li>
              <li>• Repeat offenders still marked active, flagged in red</li>
              <li>• Events per active cook, so city sizes compare fairly</li>
              <li>• A daily trend and a plain-language summary of the pattern</li>
              <li>• A clear definition of what counts as a dropout</li>
            </ul>
            <Link target="_blank" href="/leadership" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200">
              View the leadership dashboard <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-t border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Built to be trusted</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Fast, but never a black box</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="rounded-2xl bg-white/5 p-5 ring-1 ring-inset ring-white/10">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-medium">Ready to see it work?</p>
            <CtaButtons className="justify-center [&_a:last-child]:border-white/20 [&_a:last-child]:bg-white/10 [&_a:last-child]:text-white [&_a:last-child:hover]:bg-white/20" />
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 px-4 pb-10 pt-2 text-center text-xs text-slate-400">
        <p>
          Prototype. Notifications, replies and calls are simulated, and the clock is fixed at 10:30 AM on 23 Sep 2026.{' '}
          <Link target="_blank" href="/data-quality" className="underline hover:text-white">Data quality report</Link>
        </p>
      </footer>
    </main>
  );
}