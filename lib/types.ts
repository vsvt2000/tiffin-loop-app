export type Meal = 'lunch' | 'dinner';

export type IncidentState =
  | 'DETECTED' | 'OPEN' | 'IMPACT_COMPUTED' | 'PROPOSED' | 'APPROVED'
  | 'REASSIGNED' | 'NOTIFIED' | 'ESCALATED' | 'CLOSED';

export interface AffectedOrder {
  orderId: string;
  subscriberId: string;
  subscriberName: string;
  meal: Meal;
  diet: 'Veg' | 'Non-Veg' | 'Jain';
  cuisine: string;
  amountInr: number;
  flags: { noPhone: boolean; possibleDuplicate: boolean; paused: boolean };
}

export interface Assignment {
  orderId: string;
  subscriberName: string;
  meal: Meal;
  backupCookId: string;
  backupCookName: string;
  tier: 1 | 2;
  status: 'proposed' | 'pending_consent' | 'confirmed' | 'rejected' | 'accepted_default';
  reasons: string[];
}

export interface Uncovered {
  orderId: string;
  subscriberName: string;
  meal: Meal;
  reason: 'no_capacity' | 'diet_mismatch' | 'no_cook_in_city';
  amountInr: number;
}

export interface Notification {
  id: string;
  subscriberName: string;
  orderIds: string[];
  message: string;
  status: 'sent' | 'failed_no_phone' | 'deduped' | 'pending_consent';
  at: string;
}

export interface IncidentEvent {
  id: string;
  at: string;
  type: string; // DETECTED, INCIDENT_CREATED, IMPACT_COMPUTED, BACKUP_PROPOSED, ...
  actor: 'system' | 'ops' | 'subscriber' | 'gemini';
  summary: string;
}

export interface Incident {
  id: string;
  cookId: string;
  cookName: string;
  city: string;
  cuisine: string;
  meals: Meal[];
  reason: string | null;
  sources: ('whatsapp' | 'sheet')[];
  originalMessage: string | null;
  detectedAt: string;
  state: IncidentState;
  requiresApproval: boolean;
  approvalReasons: string[];
  minutesToMeal: Partial<Record<Meal, number>>;
  affected: AffectedOrder[];
  assignments: Assignment[];
  uncovered: Uncovered[];
  notifications: Notification[];
  events: IncidentEvent[];
}

export interface ScheduledNotice {
  id: string;
  sender: string;
  text: string;
  note: string; // e.g. "Delay for tomorrow, no action today"
}

export interface OpsPayload {
  incidents: Incident[];
  scheduledNotices: ScheduledNotice[];
  meta: { now: string; ephemeral: boolean };
}

export interface LeadershipPayload {
  window: { start: string; end: string };
  definition: string;
  kpis: {
    events: number;
    cooksWithEvents: number;
    repeatOffenders: number; // 3+ events
    topTwoShare: number;     // 0..100
  };
  byCity: { city: string; events: number; activeCooks: number; perCook: number }[];
  byCook: {
    cookId: string; name: string; city: string; events: number;
    sheetStatus: string; stillActiveRisk: boolean;
  }[];
  trend: { date: string; events: number }[];
}

export interface DataQualityPayload {
  categories: {
    category: string; label: string; count: number; resolution: string;
    examples: { recordId: string; field: string; raw: string; cleaned: string }[];
  }[];
  needsHuman: {
    category: string; label: string; count: number; note: string;
    examples: { recordId: string; field: string; raw: string; cleaned: string }[];
  }[];
}