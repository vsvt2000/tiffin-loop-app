// lib/events.ts
import { simulatedIso } from './clock';
import type { IncidentEvent } from './types';

export type EventType =
  | 'DETECTED' | 'INCIDENT_CREATED' | 'IMPACT_COMPUTED' | 'BACKUP_PROPOSED' | 'OPS_APPROVED'
  | 'ORDER_REASSIGNED' | 'NOTIFICATION_SENT' | 'NOTIFICATION_FAILED' | 'SUBSCRIBER_REPLIED'
  | 'ESCALATED' | 'REFUND_ISSUED' | 'CLOSED';

export type Actor = IncidentEvent['actor'];

export interface LogEvent extends IncidentEvent {
  incidentId: string;
  atSec: number; // seconds after the simulated "now" (10:30:00 IST)
  seq: number;
  payload?: Record<string, unknown>;
}

// Append-only: there is no update or delete. The log is the audit trail.
export class EventLog {
  private items: LogEvent[] = [];

  add(
    incidentId: string, atSec: number, type: EventType, actor: Actor,
    summary: string, payload?: Record<string, unknown>,
  ): void {
    const seq = this.items.length + 1;
    this.items.push({ id: `EV-${seq}`, incidentId, atSec, seq, at: simulatedIso(atSec), type, actor, summary, payload });
  }

  forIncident(incidentId: string): LogEvent[] {
    return this.items
      .filter((e) => e.incidentId === incidentId)
      .sort((a, b) => a.atSec - b.atSec || a.seq - b.seq);
  }

  all(): LogEvent[] {
    return [...this.items];
  }
}