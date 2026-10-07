// lib/classify.ts
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { ParsedMessage } from './detect';

export const CATEGORIES = [
  'COOK_DROPOUT', 'COOK_DELAY', 'CUSTOMER_COMPLAINT', 'DELIVERY_ISSUE', 'GENERAL',
] as const;

export const ClassificationSchema = z.object({
  category: z.enum(CATEGORIES),
  cookRef: z.string().nullable(),
  meal: z.enum(['lunch', 'dinner', 'both', 'unspecified']),
  targetDate: z.enum(['today', 'tomorrow', 'other']),
  reason: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type RawClassification = z.infer<typeof ClassificationSchema>;
export type Classification = RawClassification & { source: 'gemini' | 'cache' | 'rules' };

const CACHE_FILE = path.join(process.cwd(), 'data', 'classification-cache.json');
let memCache: Record<string, RawClassification> | null = null;

function readCache(): Record<string, RawClassification> {
  if (memCache) return memCache;
  try {
    memCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as Record<string, RawClassification>;
  } catch {
    memCache = {};
  }
  return memCache;
}

// ---------- deterministic fallback classifier (English + Hinglish) ----------
const DROPOUT_RE: RegExp[] = [
  /\bnot cooking\b/, /\bcan'?t cook\b/, /\bcannot cook\b/, /\bwon'?t be able to cook\b/,
  /\bfever\b/, /\bsick\b/, /\bunwell\b/, /\b(?:also )?out today\b/, /\bnot available today\b/,
  /nahi ho pa+yega/, /nahi ho pa+yegi/, /nahi ho payega/, /\baaj nahi\b/, /jana pad raha/,
  /nahi kar pa+unga/, /nahi kar pa+ungi/, /nahi aa pa+unga/, /nahi aa pa+ungi/,
];
const DELAY_RE = /\blate\b|\bdelay(?:ed)?\b/;
const DELIVERY_RE = /delivery (?:boy|partner|guy|rider|issue|delay)|\brider\b/;
const COMPLAINT_RE = /asking why|complain|reminder messages|not received|didn'?t (?:get|receive)|wrong order|\brefund\b/;

export function rulesClassify(m: ParsedMessage): Classification {
  const t = m.text.toLowerCase();
  const hasLunch = /\blunch\b/.test(t);
  const hasDinner = /\bdinner\b/.test(t);
  const meal: RawClassification['meal'] =
    (hasLunch && hasDinner) || /\bboth\b/.test(t) ? 'both' : hasLunch ? 'lunch' : hasDinner ? 'dinner' : 'unspecified';
  const targetDate: RawClassification['targetDate'] = /\btomorrow\b|\bkal\b/.test(t) ? 'tomorrow' : 'today';
  const cookRef = m.senderType === 'cook' ? m.sender : null;

  let reason: string | null = null;
  if (/\bfever\b/.test(t)) reason = 'Sick (fever)';
  else if (/\bsick\b|\bunwell\b/.test(t)) reason = 'Sick';
  else if (/family function/.test(t)) reason = 'Family function';
  else if (/family emergency/.test(t)) reason = 'Family emergency';
  else if (/\bgaon\b|\bvillage\b/.test(t)) reason = 'Urgent trip to village';

  const base = { cookRef, meal, targetDate, reason, source: 'rules' as const };
  if (DROPOUT_RE.some((r) => r.test(t))) return { category: 'COOK_DROPOUT', confidence: 0.85, ...base };
  if (DELAY_RE.test(t)) return { category: 'COOK_DELAY', confidence: 0.8, ...base, reason: null };
  if (DELIVERY_RE.test(t)) return { category: 'DELIVERY_ISSUE', confidence: 0.7, ...base, reason: null };
  if (COMPLAINT_RE.test(t)) return { category: 'CUSTOMER_COMPLAINT', confidence: 0.75, ...base, cookRef: null, reason: null };
  return { category: 'GENERAL', confidence: 0.6, ...base, cookRef: null, reason: null };
}

// ---------- Gemini (server-side, used only when warming the cache) ----------
const PROMPT = `You classify one message from a meal-subscription ops WhatsApp group (India; English, Hindi or Hinglish).
Return ONLY JSON with keys:
category: COOK_DROPOUT | COOK_DELAY | CUSTOMER_COMPLAINT | DELIVERY_ISSUE | GENERAL
cookRef: the home cook the message is about, as written (strip honorifics like aunty, ji, sir), or null
meal: lunch | dinner | both | unspecified
targetDate: today | tomorrow | other  (a message about "tomorrow"/"kal" is tomorrow)
reason: short reason or null
confidence: number 0..1
Rules: a cook who cannot cook is COOK_DROPOUT. Running late is COOK_DELAY. A message saying everything is fine, or ops chatter, is GENERAL.
If the sender is a cook, cookRef is the sender. Never invent a name.`;

export async function geminiClassify(m: ParsedMessage): Promise<RawClassification | null> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!key || !model) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${PROMPT}\n\nSender: ${m.sender} (${m.senderType})\nMessage: ${m.text}` }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = ClassificationSchema.safeParse(JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ---------- runtime path: cache first, then rules. Never a live call. ----------
export function classifyMessage(m: ParsedMessage): Classification {
  const hit = readCache()[m.key];
  if (hit) {
    const ok = ClassificationSchema.safeParse(hit);
    if (ok.success) return { ...ok.data, source: 'cache' };
  }
  return rulesClassify(m);
}

// ---------- build-time: run once locally, commit data/classification-cache.json ----------
export async function warmClassificationCache(messages: ParsedMessage[]): Promise<{ gemini: number; rules: number }> {
  const out: Record<string, RawClassification> = {};
  let gemini = 0, rules = 0;
  for (const m of messages) {
    const g = await geminiClassify(m);
    if (g) { out[m.key] = g; gemini++; }
    else { const { source: _s, ...r } = rulesClassify(m); out[m.key] = r; rules++; }
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(out, null, 2));
  memCache = out;
  return { gemini, rules };
}