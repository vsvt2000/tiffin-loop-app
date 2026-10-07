import fs from 'node:fs';
import path from 'node:path';

// ---------- types ----------
export type City = 'Bengaluru' | 'Mumbai' | 'Pune';
export type OrderStatus =
  | 'delivered' | 'pending' | 'in_progress' | 'cancelled' | 'refunded' | 'cook_dropout';
export type Meal = 'lunch' | 'dinner';
export type Diet = 'Veg' | 'Non-Veg' | 'Jain';

export interface Cook {
  cookId: string; name: string; city: City; cuisine: string; serves: Diet[];
  phone: string | null; status: 'active' | 'on_leave' | 'inactive';
  statusSince: string | null; joined: string; maxDaily: number;
}
export interface Subscriber {
  subscriberId: string; name: string; city: City; phone: string | null;
  assignedCookId: string; mealPlan: string; cuisinePref: string; diet: Diet;
  status: 'active' | 'paused'; startDate: string; duplicateOf: string | null;
}
export interface Order {
  orderId: string; date: string; subscriberId: string; cookId: string;
  meal: Meal; status: OrderStatus; rawStatus: string; amountInr: number;
}
export interface Trap {
  id: string; category: string; field: string;
  rawValue: string | null; cleanedValue: string | null; recordId: string;
}
export interface Dataset {
  cooks: Cook[]; subscribers: Subscriber[]; orders: Order[]; trapLog: Trap[];
  cookDuplicateGroups: string[][];
}

// ---------- csv (no dependency) ----------
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some((c) => c !== '')) rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

// ---------- field cleaners ----------
const CITY: Record<string, City> = {
  bengaluru: 'Bengaluru', bangalore: 'Bengaluru', blr: 'Bengaluru',
  mum: 'Mumbai', mumbai: 'Mumbai', bombay: 'Mumbai', pune: 'Pune',
};
export const canonCity = (raw: string): City | null => CITY[raw.trim().toLowerCase()] ?? null;

const STATUS: Record<string, OrderStatus> = {
  delivered: 'delivered', completed: 'delivered',
  pending: 'pending', 'in progress': 'in_progress', 'in-progress': 'in_progress',
  cancelled: 'cancelled', refunded: 'refunded',
  cook_dropout: 'cook_dropout', 'cook no show': 'cook_dropout', 'no show': 'cook_dropout',
  'cook no-show': 'cook_dropout', 'cancelled - cook unavailable': 'cook_dropout',
};
export const canonStatus = (raw: string): OrderStatus | null => STATUS[raw.trim().toLowerCase()] ?? null;

const MON: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const pad = (n: number) => String(n).padStart(2, '0');
function valid(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
// Explicit patterns only. Never new Date(string): "09/10/2026" would be guessed.
export function parseDate(raw: string): { iso: string | null; format: 'iso' | 'dmy' | 'dmon' | 'unknown' } {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return { iso: valid(+m[1], +m[2], +m[3]), format: 'iso' };
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return { iso: valid(+m[3], +m[2], +m[1]), format: 'dmy' };
  m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(s);
  if (m && MON[m[2].toLowerCase()]) return { iso: valid(+m[3], MON[m[2].toLowerCase()], +m[1]), format: 'dmon' };
  return { iso: null, format: 'unknown' };
}

export function phoneKey(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}
function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
export function nameSimilarity(a: string, b: string): number {
  const x = normName(a), y = normName(b);
  const L = Math.max(x.length, y.length);
  return L ? 1 - lev(x, y) / L : 1;
}

// ---------- loader ----------
let cache: Dataset | null = null;

export function loadData(dataDir = path.join(process.cwd(), 'data')): Dataset {
  if (cache) return cache;
  const read = (f: string) => fs.readFileSync(path.join(dataDir, f), 'utf8');
  const trapLog: Trap[] = [];
  let seq = 0;
  const trap = (category: string, field: string, raw: string | null, cleaned: string | null, recordId: string) =>
    trapLog.push({ id: `T${++seq}`, category, field, rawValue: raw, cleanedValue: cleaned, recordId });

  const cleanPhone = (raw: string, recordId: string, kind: 'cook' | 'subscriber') => {
    const key = phoneKey(raw);
    if (!raw) trap(`missing_phone_${kind}`, 'phone', '', null, recordId);
    else if (key !== raw) trap('phone_format', 'phone', raw, key, recordId);
    return key;
  };
  const cleanCity = (raw: string, recordId: string): City => {
    const c = canonCity(raw);
    if (!c) throw new Error(`Unmapped city "${raw}" on ${recordId}`);
    if (c !== raw) trap('city_alias', 'city', raw, c, recordId);
    return c;
  };

  const cooks: Cook[] = parseCsv(read('cooks.csv')).map((r) => {
    let statusSince: string | null = null;
    if (r.status_since) {
      const p = parseDate(r.status_since);
      statusSince = p.iso;
      if (p.format !== 'iso') trap('status_since_format', 'status_since', r.status_since, p.iso, r.cook_id);
    }
    return {
      cookId: r.cook_id, name: r.cook_name, city: cleanCity(r.city, r.cook_id),
      cuisine: r.cuisine_specialty,
      serves: r.serves.split(',').map((x) => x.trim()).filter(Boolean) as Diet[],
      phone: cleanPhone(r.phone, r.cook_id, 'cook'),
      status: r.status as Cook['status'], statusSince,
      joined: parseDate(r.joined_date).iso ?? r.joined_date, maxDaily: parseInt(r.max_daily_orders, 10),
    };
  });

  const subscribers: Subscriber[] = parseCsv(read('subscribers.csv')).map((r) => ({
    subscriberId: r.subscriber_id, name: r.subscriber_name, city: cleanCity(r.city, r.subscriber_id),
    phone: cleanPhone(r.phone, r.subscriber_id, 'subscriber'), assignedCookId: r.assigned_cook_id,
    mealPlan: r.meal_plan, cuisinePref: r.cuisine_pref, diet: r.diet as Diet,
    status: r.subscription_status as Subscriber['status'],
    startDate: parseDate(r.start_date).iso ?? r.start_date, duplicateOf: null,
  }));

  // Duplicate subscribers: same phone key AND similar name. Both kept; the later one links to the earlier.
  const byPhone = new Map<string, Subscriber[]>();
  for (const s of subscribers) if (s.phone) byPhone.set(s.phone, [...(byPhone.get(s.phone) ?? []), s]);
  for (const group of byPhone.values()) {
    for (let i = 1; i < group.length; i++)
      for (let j = 0; j < i; j++)
        if (!group[i].duplicateOf && nameSimilarity(group[i].name, group[j].name) >= 0.8) {
          group[i].duplicateOf = group[j].subscriberId;
          trap('duplicate_subscriber', 'subscriber_id', group[i].subscriberId,
            `duplicate of ${group[j].subscriberId}`, group[i].subscriberId);
        }
  }

  // Duplicate cook names: flag only, never merge (separate order histories).
  const cookGroups = new Map<string, Cook[]>();
  for (const c of cooks) {
    const k = `${normName(c.name)}|${c.city}`;
    cookGroups.set(k, [...(cookGroups.get(k) ?? []), c]);
  }
  const cookDuplicateGroups: string[][] = [];
  for (const g of cookGroups.values())
    if (g.length > 1) {
      cookDuplicateGroups.push(g.map((c) => c.cookId));
      for (const c of g)
        trap('duplicate_cook_name', 'cook_name', c.name,
          `shares name with ${g.filter((x) => x !== c).map((x) => x.cookId).join(', ')}`, c.cookId);
    }

  const orders: Order[] = parseCsv(read('orders.csv')).map((r) => {
    const d = parseDate(r.order_date);
    if (!d.iso) throw new Error(`Unparseable order date "${r.order_date}" on ${r.order_id}`);
    if (d.format !== 'iso') trap('date_format', 'order_date', r.order_date, d.iso, r.order_id);
    const st = canonStatus(r.status);
    if (!st) throw new Error(`Unmapped status "${r.status}" on ${r.order_id}`);
    if (r.status !== st) trap('status_variant', 'status', r.status, st, r.order_id);
    return {
      orderId: r.order_id, date: d.iso, subscriberId: r.subscriber_id, cookId: r.cook_id,
      meal: r.meal_type.toLowerCase() as Meal, status: st, rawStatus: r.status,
      amountInr: parseInt(r.amount_inr, 10),
    };
  });

  cache = { cooks, subscribers, orders, trapLog, cookDuplicateGroups };
  return cache;
}

export function resetDataCache() { cache = null; }