// lib/detect.ts
import fs from 'node:fs';
import path from 'node:path';
import { TODAY } from './clock';
import type { Cook, Dataset, Meal } from './normalize';
import { nameSimilarity, normName } from './normalize';
import { classifyMessage, type Classification } from './classify';
import type { ScheduledNotice } from './types';

// ---------- cook-name resolution (code only, the LLM never picks a cook_id) ----------
const HONORIFICS = new Set(['aunty', 'auntie', 'ji', 'sir', 'bhaiya', 'anna', 'madam', 'didi', 'uncle', 'bhabhi', 'mam', 'maam']);

export interface CookMatch {
  cookId: string | null;
  candidates: string[];
  needsReview: boolean;
  matchedOn: string | null;
}
const NO_MATCH: CookMatch = { cookId: null, candidates: [], needsReview: false, matchedOn: null };

export function stripHonorifics(ref: string): string {
  return ref
    .split(/\s+/)
    .filter((t) => !HONORIFICS.has(t.toLowerCase().replace(/[^a-z]/g, '')))
    .join(' ')
    .trim();
}

export function resolveCook(ref: string, cooks: Cook[]): CookMatch {
  const name = normName(stripHonorifics(ref));
  if (!name) return NO_MATCH;
  let found = cooks.filter((c) => normName(c.name) === name);
  if (!found.length && !name.includes(' ')) found = cooks.filter((c) => normName(c.name).split(' ')[0] === name);
  if (!found.length && name.includes(' ')) found = cooks.filter((c) => nameSimilarity(c.name, name) >= 0.85);
  if (found.length === 1) return { cookId: found[0].cookId, candidates: [found[0].cookId], needsReview: false, matchedOn: ref };
  if (found.length > 1) return { cookId: null, candidates: found.map((c) => c.cookId), needsReview: true, matchedOn: ref };
  return NO_MATCH;
}

const STOP = new Set([
  'reminder', 'noted', 'updated', 'will', 'ok', 'standup', 'priya', 'rohan', 'bangalore', 'mysore', 'expect',
  'tomorrow', 'good', 'morning', 'fever', 'sorry', 'bhaiya', 'team', 'festival', 'sheet',
]);
function capitalisedPhrases(text: string): string[] {
  const out = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
  return out.filter((p) => !STOP.has(p.toLowerCase()));
}

// ---------- WhatsApp parsing ----------
export interface ParsedMessage {
  id: string;
  key: string;
  at: string; // ISO with +05:30
  sender: string;
  text: string;
  senderType: 'ops' | 'cook' | 'unknown';
  senderMatch: CookMatch | null;
}

const LINE = /^(\d{2})\/(\d{2})\/(\d{2}), (\d{1,2}):(\d{2}) (am|pm) - ([^:]+?): (.*)$/i;

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function parseWhatsApp(raw: string, cooks: Cook[]): ParsedMessage[] {
  const msgs: ParsedMessage[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = LINE.exec(line);
    if (!m) {
      if (line.trim() && msgs.length) msgs[msgs.length - 1].text += `\n${line.trim()}`; // continuation line
      continue;
    }
    const [, dd, mm, yy, hh, min, ap, sender, text] = m;
    let h = parseInt(hh, 10) % 12;
    if (ap.toLowerCase() === 'pm') h += 12;
    const at = `20${yy}-${mm}-${dd}T${String(h).padStart(2, '0')}:${min}:00+05:30`;
    const isOps = /\(ops\)/i.test(sender);
    const match = isOps ? null : resolveCook(sender, cooks);
    const isCook = !!match && (!!match.cookId || match.needsReview);
    msgs.push({
      id: `M${msgs.length + 1}`,
      key: hash(`${at}|${sender}|${text}`),
      at, sender: sender.trim(), text: text.trim(),
      senderType: isOps ? 'ops' : isCook ? 'cook' : 'unknown',
      senderMatch: isCook ? match : null,
    });
  }
  return msgs;
}

// ---------- detection ----------
export interface Signal {
  source: 'whatsapp' | 'sheet';
  at: string | null;
  sender: string | null;
  text: string | null;
  classification: Classification | null;
  meals: Meal[];
  reason: string | null;
  confidence: number;
}
export interface DetectedIncident {
  id: string;
  cookId: string;
  sources: ('whatsapp' | 'sheet')[];
  signals: Signal[];
  meals: Meal[];
  reason: string | null;
  originalMessage: string | null;
  lowConfidence: boolean;
  firstAt: string;
}
export interface Detection {
  messages: ParsedMessage[];
  incidents: DetectedIncident[];
  notices: ScheduledNotice[];
  noImpactCooks: string[];
}

const BOTH: Meal[] = ['lunch', 'dinner'];
const mealsFrom = (m: Classification['meal']): Meal[] => (m === 'lunch' ? ['lunch'] : m === 'dinner' ? ['dinner'] : BOTH);
const firstWord = (s: string) => s.trim().split(/\s+/)[0];

function resolveForMessage(m: ParsedMessage, cls: Classification, cooks: Cook[]): CookMatch {
  if (m.senderType === 'cook' && m.senderMatch) return m.senderMatch;
  if (cls.cookRef) {
    const r = resolveCook(cls.cookRef, cooks);
    if (r.cookId || r.needsReview) return r;
  }
  for (const phrase of capitalisedPhrases(m.text)) {
    const r = resolveCook(phrase, cooks);
    if (r.cookId || r.needsReview) return r;
  }
  return NO_MATCH;
}

function complaintHint(text: string, data: Dataset): string {
  const words = new Set(capitalisedPhrases(text).map((p) => firstWord(p).toLowerCase()));
  const dupIds = new Set<string>();
  for (const s of data.subscribers) {
    if (!words.has(firstWord(s.name).toLowerCase())) continue;
    if (s.duplicateOf) { dupIds.add(s.subscriberId); dupIds.add(s.duplicateOf); }
  }
  return dupIds.size
    ? `Likely duplicate subscriber records (${[...dupIds].sort().join(' / ')}), so one reminder per record. See Data quality.`
    : 'Customer complaint routed to Ops. No cook incident.';
}

export function detectIncidents(data: Dataset, dataDir = path.join(process.cwd(), 'data')): Detection {
  const raw = fs.readFileSync(path.join(dataDir, 'ops_whatsapp_export.txt'), 'utf8');
  const messages = parseWhatsApp(raw, data.cooks);
  const cookById = new Map(data.cooks.map((c) => [c.cookId, c]));
  const notices: ScheduledNotice[] = [];
  const signals = new Map<string, Signal[]>();
  const addSignal = (cookId: string, s: Signal) => signals.set(cookId, [...(signals.get(cookId) ?? []), s]);

  for (const m of messages) {
    const cls = classifyMessage(m);
    const note = (n: string) => notices.push({ id: `NT-${m.id}`, sender: m.sender, text: m.text, note: n });

    if (cls.category === 'COOK_DROPOUT') {
      const match = resolveForMessage(m, cls, data.cooks);
      if (cls.targetDate !== 'today') {
        note(`Dropout for ${cls.targetDate}, not today. Logged as a scheduled notice.`);
      } else if (match.needsReview) {
        note(`Needs review: name matches several cooks (${match.candidates.join(', ')}). No incident created automatically.`);
      } else if (!match.cookId) {
        note('Needs review: could not identify the cook. No incident created automatically.');
      } else if (cls.confidence < 0.6) {
        note(`Needs review: low confidence (${cls.confidence.toFixed(2)}) for ${cookById.get(match.cookId)?.name}.`);
      } else {
        addSignal(match.cookId, {
          source: 'whatsapp', at: m.at, sender: m.sender, text: m.text, classification: cls,
          meals: mealsFrom(cls.meal), reason: cls.reason, confidence: cls.confidence,
        });
      }
    } else if (cls.category === 'COOK_DELAY') {
      const who = resolveForMessage(m, cls, data.cooks);
      const cook = who.cookId ? cookById.get(who.cookId)?.name : null;
      note(
        cls.targetDate === 'today'
          ? `Delay today${cook ? ` (${cook})` : ''}: check whether lunch orders are at risk.`
          : `Delay for ${cls.targetDate}${cook ? ` (${cook})` : ''}. No action today.`,
      );
    } else if (cls.category === 'CUSTOMER_COMPLAINT') {
      note(complaintHint(m.text, data));
    } else if (cls.category === 'DELIVERY_ISSUE') {
      note('Delivery issue routed to Ops.');
    }
  }

  // Sheet-based detection: cook marked unavailable who still holds open orders today.
  const openByCook = new Map<string, Set<Meal>>();
  for (const o of data.orders)
    if (o.date === TODAY && (o.status === 'pending' || o.status === 'in_progress'))
      openByCook.set(o.cookId, (openByCook.get(o.cookId) ?? new Set()).add(o.meal));

  const noImpactCooks: string[] = [];
  for (const c of data.cooks) {
    if (c.status === 'active' || !c.statusSince || c.statusSince > TODAY) continue;
    const meals = openByCook.get(c.cookId);
    if (!meals || !meals.size) { noImpactCooks.push(c.cookId); continue; }
    addSignal(c.cookId, {
      source: 'sheet', at: null, sender: null, text: null, classification: null,
      meals: BOTH.filter((x) => meals.has(x)), reason: null, confidence: 1,
    });
  }
  if (noImpactCooks.length)
    notices.push({
      id: 'NT-sheet', sender: 'Cook sheet',
      text: `${noImpactCooks.length} other cooks are marked on leave or inactive`,
      note: 'None have open orders today: no customer impact, nothing to reassign.',
    });

  // Merge: one incident per cook per day, with every source recorded.
  const merged: Omit<DetectedIncident, 'id'>[] = [...signals.entries()].map(([cookId, sigs]) => {
    const wa = sigs.filter((s) => s.source === 'whatsapp');
    const first = wa[0];
    return {
      cookId,
      sources: [...(wa.length ? ['whatsapp' as const] : []), ...(sigs.some((s) => s.source === 'sheet') ? ['sheet' as const] : [])],
      signals: sigs,
      meals: BOTH.filter((m) => sigs.some((s) => s.meals.includes(m))),
      reason: wa.map((s) => s.reason).find(Boolean) ?? null,
      originalMessage: first?.text ?? null,
      lowConfidence: wa.some((s) => s.confidence < 0.7),
      firstAt: first?.at ?? '9999',
    };
  });
  merged.sort((a, b) => (a.firstAt === b.firstAt ? a.cookId.localeCompare(b.cookId) : a.firstAt.localeCompare(b.firstAt)));
  const incidents = merged.map((m, i) => ({ id: `INC-${1001 + i}`, ...m }));

  return { messages, incidents, notices, noImpactCooks };
}