# TiffinLoop Cook-Dropout Response

When a home cook can't cook, this tool finds the affected orders, proposes backup cooks, writes one message per subscriber, and tracks the outcome. It also gives leadership a one-page view of dropouts by city and cook.

**Live demo:** :https://tiffin-loop-app.vercel.app/
**Build log:** 
- ChatGPT(BrainStorming): https://chatgpt.com/share/6ac69cce-3abc-83ec-9332-b0666f6ea133
- Claude(Building): https://claude.ai/share/d2f18a79-814f-44e3-a72e-fefcb23b1c2e

> Built as a 4-hour prototype for the assignment. Messages are simulated, not sent to real phones.

---

## What it does

| Page | Route | For | What you can do |
| --- | --- | --- | --- |
| Home | `/` | Everyone | What the tool is, how to use it, links to the other pages |
| Ops console | `/ops` | Ops coordinator | Review incidents, approve proposals, simulate subscriber replies, see the event timeline and workflow view |
| Leadership | `/leadership` | Leadership | Dropouts by city and by cook (30 days), plus a "Generate insights" button |
| Data quality | `/data-quality` | Ops, reviewers | Every cleaning rule applied to the seed data, with counts and examples |

## The key design choice

**Code decides. The LLM reads and explains.**

- Gemini classifies WhatsApp messages and writes leadership insights.
- Gemini never picks a cook, never writes a fact into a subscriber message, and never changes an order.
- Matching, capacity, ranking and message text are plain code, so results are repeatable and auditable.
- Every LLM output is checked against a schema, and every number in an insight is checked against figures computed in code.
- With no API key, everything still works from rule-based fallbacks.

## How it works

1. **Load and clean.** The seed files are read as given and never edited. Cleaning happens in code: city aliases, explicit date formats, 18 status spellings mapped to 6, phone key (last 10 digits), duplicate subscriber and cook-name flags.
2. **Detect.** Dropouts come from the WhatsApp export (classified, then the cook is resolved in code) and from the cook sheet. Signals merge into one incident per cook per day.
3. **Find impact.** The incident lists the cook's affected orders by meal (lunch 12:30 PM, dinner 7:30 PM).
4. **Match.** Orders are assigned across all incidents together (lunch first, then longest-tenured subscriber, then order id) against one shared capacity ledger.
   - Tier 1: same cuisine, the subscriber is told and can opt out.
   - Tier 2: different cuisine, only sent if the subscriber accepts.
   - No eligible cook: the order is shown as uncovered, with the reason.
5. **Notify.** One message per person, even when a person has duplicate subscriber records. No phone number means the order is escalated to Ops.
6. **Track.** Each incident moves through `PROPOSED → NOTIFIED → CLOSED`, or `ESCALATED`.

### Matching rules

| Rule | Value |
| --- | --- |
| Capacity mode | Per day |
| Max recent dropouts for a backup cook | 3 |
| Max backup attempts per order | 2 |
| Cooks in any open incident | Never used as backups |
| Ranking | Fewest recent dropouts, then most free slots, then earliest joined |
| Duplicate subscriber match | Same phone key and name similarity of 0.8 or more |

### Fixed demo clock

The app runs on a fixed clock so results are repeatable: **2026-09-23, 10:30 AM IST**. Business logic never reads the system time. The constants live in `lib/clock.ts`.

## Tech stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Recharts for charts, Zod for validation
- Gemini API (`gemini-3.1-flash-lite` for leadership insights)
- Supabase (optional) for storing Ops actions, with an in-memory fallback
- Workflow view is drawn from real events, no n8n subscription needed

## Project structure

```text
app/
  page.tsx                  Home page
  ops/                      Ops console
  leadership/               Leadership dashboard
  data-quality/             Data-quality report
  flow/                     Journey and flowchart
  api/
    incidents/              List incidents; approve, reply, refund per incident
    leadership/             Dashboard data; /insights generates AI insights
    data-quality/           Data-quality payload
    insight/                Per-incident summary
    reset/                  Reset demo actions
components/
  ops/                      Incident list, detail, impact table, proposal,
                            notifications, timeline, workflow view
  JourneyFlowchart.tsx
  LeadershipInsights.tsx
lib/
  clock.ts                  Fixed demo clock and meal times
  normalize.ts              Data loading and cleaning
  classify.ts               Message classification (Gemini + rules fallback)
  detect.ts                 Dropout detection and incident merge
  impact.ts                 Affected orders
  match.ts                  Backup matching and capacity ledger
  notify.ts                 Message templates, one per person
  events.ts                 Event log
  incident.ts               State machine and replay (buildWorld)
  viewmodel.ts              Data shaped for the UI
  store.ts                  Persistence (Supabase or in-memory)
  leadership.ts             Dashboard numbers
  insights.ts               AI insights with grounding guard
  gemini.ts                 Gemini client for summaries
scripts/
  warm-classification-cache.ts   Pre-classify messages and save the cache
data/
  cooks.csv, subscribers.csv, orders.csv, ops_whatsapp_export.txt
```

## Getting started

### Requirements
- Node.js 18.17 or newer
- npm

### Install and run

```bash
git clone TODO_REPO_URL
cd TODO_REPO_FOLDER
npm install
cp .env.example .env.local   # then fill in the values you want (all optional)
npm run dev
```

Open http://localhost:3000.

### Environment variables

All are optional. The app runs without them.

| Variable | Used for | If missing |
| --- | --- | --- |
| `GEMINI_API_KEY` | Message classification and leadership insights | Rule-based classification and insights |
| `GEMINI_MODEL` | Override the insights model (default `gemini-3.1-flash-lite`) | Default model |
| `SUPABASE_URL` | Saving Ops actions | In-memory storage; the UI shows an "ephemeral" banner |
| `SUPABASE_SERVICE_ROLE_KEY` | Saving Ops actions (server only) | In-memory storage |

Never commit `.env.local`. Keys are read on the server only.

### Optional: Supabase setup

Run once in the Supabase SQL editor:

```sql
create table if not exists tl_state (id text primary key, state jsonb not null);
```

Only Ops actions (approve, reply, refund) are stored. Incidents, proposals, notifications and the timeline are rebuilt from the seed data plus those actions, so the audit trail is reproducible.

### Optional: warm the classification cache

Classifies the WhatsApp messages once with Gemini and saves the results to `data/classification-cache.json`, so the running app never needs a live model call.

```bash
npx tsx scripts/warm-classification-cache.ts
```

### Deploy

1. Push the repository to GitHub.
2. Import it in Vercel.
3. Add the environment variables above in the project settings.
4. Deploy.

## Try it in two minutes

1. Open `/ops`. Pick an incident from the list.
2. Read the detected cook, the original message, the affected orders and the proposed backups with reasons.
3. Click **Approve**. Notifications appear, one per person.
4. Simulate subscriber replies (1, 2 or timeout) and watch the timeline and state change.
5. Open `/leadership`. Click **Generate insights**.
6. Open `/data-quality` to see exactly how the seed data was cleaned.

## What the seed data shows

| Finding | Number |
| --- | --- |
| Dropout events, last 30 days | 128 |
| Top two cooks | 35 events (27.3%) |
| Pune events from two cooks | 35 of 44 |
| Events per active cook, Pune vs Mumbai | 4.0 vs 0.6 |
| Last 7 completed days vs previous 7 | 34 vs 24 (+41.7%) |
| Cooks with 3 or more events still marked active | 10 of 10 |

A dropout event is one cook, one date and one meal with an explicit dropout status. Plain cancelled and refunded orders are not counted.

## Known limits

- Messages are simulated, not sent through WhatsApp.
- The tool assumes a backup cook accepts. Backup confirmation is the first planned addition.
- Replies are limited to 1, 2 and timeout. Free-text replies are not handled.
- Refund and Tier 2 timeout actions exist in the API but have no UI button, so an incident with a no-phone order stays `ESCALATED` rather than `CLOSED`.
- There is no rating or distance data, so backups are not ranked by either.
- No logins or roles.
- Capacity is assumed to be per day. Whether it should be per meal is an open question.

## Security

- No secrets in the repository. Keys come from environment variables on the server.
- Seed files are read-only and never modified.
- Insights have a 15-second refresh cooldown and are cached, to protect the API key on a public demo.

## Documentation

- PRD: TODO (link)
- Build log: TODO (link)

## License

TODO (add a license or remove this section)