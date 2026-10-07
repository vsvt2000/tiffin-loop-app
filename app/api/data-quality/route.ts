/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { loadData } from '@/lib/normalize'; // ADAPT
import type { DataQualityPayload } from '@/lib/types';


// ADAPT: category keys must match the strings your trapLog uses.
const META: Record<string, { label: string; resolution: string; human?: string }> = {
  city_alias: { label: 'City spelling variants', resolution: 'Mapped to Bengaluru, Mumbai or Pune' },
  date_format: { label: 'Mixed order date formats', resolution: 'Parsed ISO first, then DD/MM/YYYY' },
  status_variant: { label: 'Order status variants', resolution: 'Mapped to canonical states' },
  status_since_format: { label: 'Cook status date formats', resolution: 'Parsed three formats' },
  phone_format: { label: 'Phone number formats', resolution: 'Reduced to the last 10 digits' },
  duplicate_subscriber: { label: 'Duplicate subscriber records', resolution: 'Linked by phone and name; one message per person' },
  duplicate_cook_name: { label: 'Cooks sharing a name and city', resolution: 'Not merged (separate order histories)', human: 'Ops must confirm identity if a message names one of these cooks' },
  missing_phone_subscriber: { label: 'Subscribers with no phone', resolution: 'Flagged as unreachable', human: 'Needs a manual call when affected' },
  missing_phone_cook: { label: 'Cooks with no phone', resolution: 'Flagged', human: 'Cannot be contacted automatically' },
};

type Ex = { recordId: string; field: string; raw: string; cleaned: string };

export async function GET() {
  const { trapLog } = loadData();
  const groups = new Map<string, any[]>();
  for (const t of trapLog) groups.set(t.category, [...(groups.get(t.category) ?? []), t]);

  const toEx = (t: any): Ex => ({
    recordId: String(t.recordId), field: t.field,
    raw: String(t.rawValue ?? ''), cleaned: String(t.cleanedValue ?? ''),
  });

  const categories: DataQualityPayload['categories'] = [];
  const needsHuman: DataQualityPayload['needsHuman'] = [];

  for (const [category, rows] of groups) {
    const m = META[category] ?? { label: category, resolution: 'Normalized in code' };
    const examples = rows.slice(0, 5).map(toEx);
    categories.push({ category, label: m.label, count: rows.length, resolution: m.resolution, examples });
    if (m.human) needsHuman.push({ category, label: m.label, count: rows.length, note: m.human, examples });
  }

  categories.sort((a, b) => b.count - a.count);
  return NextResponse.json({ categories, needsHuman } satisfies DataQualityPayload);
}