// lib/judicial/transparency-ledger.ts
// Immutable Transparency Ledger
//
// Every significant action in a case is written as an append-only event.
// Each event carries a SHA-256 hash of its content + the previous event's
// hash, forming a tamper-evident chain (lightweight blockchain).

import { createHash } from "crypto";
import type {
  Case,
  CaseParty,
  TransparencyEvent,
  TransparencyEventType,
} from "./types";

// ─── Ledger ───────────────────────────────────────────────────────────────────

export class TransparencyLedger {
  private events: TransparencyEvent[] = [];

  // ── Write ─────────────────────────────────────────────────────────────────

  record(
    caseId: string,
    eventType: TransparencyEventType,
    actor: Pick<CaseParty, "id" | "role">,
    description: string
  ): TransparencyEvent {
    const timestamp = new Date().toISOString();
    const previousHash =
      this.events.length > 0
        ? this.events[this.events.length - 1].immutableHash
        : "GENESIS";

    // Deterministic content string for hashing
    const content = JSON.stringify({
      caseId,
      eventType,
      timestamp,
      actorId: actor.id,
      actorRole: actor.role,
      description,
      previousHash,
    });

    const immutableHash = createHash("sha256").update(content).digest("hex");

    const event: TransparencyEvent = {
      id: `evt_${immutableHash.slice(0, 16)}`,
      caseId,
      eventType,
      timestamp,
      actorId: actor.id,
      actorRole: actor.role,
      description,
      immutableHash,
    };

    this.events.push(event);
    return event;
  }

  // ── Bulk seed from a case (initial filing) ────────────────────────────────

  seedFromCase(
    caseData: Case,
    filer: Pick<CaseParty, "id" | "role">
  ): TransparencyEvent[] {
    const recorded: TransparencyEvent[] = [];

    recorded.push(
      this.record(
        caseData.id,
        "CASE_FILED",
        filer,
        `Case "${caseData.caseNumber} — ${caseData.title}" filed in ${caseData.court} (${caseData.jurisdiction}).`
      )
    );

    for (const charge of caseData.charges) {
      recorded.push(
        this.record(
          caseData.id,
          "CHARGE_ADDED",
          filer,
          `Charge added: ${charge.statute} — ${charge.description} (${charge.category}, max ${charge.maxSentenceYears}y).`
        )
      );
    }

    for (const evidence of caseData.evidence) {
      recorded.push(
        this.record(
          caseData.id,
          "EVIDENCE_SUBMITTED",
          { id: filer.id, role: filer.role },
          `Evidence submitted: [${evidence.id}] ${evidence.type} — ${evidence.description}. Authenticated: ${evidence.authenticated}. Exculpatory: ${evidence.exculpatoryFlag}.`
        )
      );
    }

    return recorded;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  getEventsByCase(caseId: string): TransparencyEvent[] {
    return this.events.filter((e) => e.caseId === caseId);
  }

  getAllEvents(): TransparencyEvent[] {
    return [...this.events];
  }

  // ── Verification ──────────────────────────────────────────────────────────

  /**
   * Verify the entire chain has not been tampered with.
   * Returns true if all hashes are consistent.
   */
  verifyIntegrity(): { valid: boolean; tamperedEventIds: string[] } {
    const tamperedEventIds: string[] = [];
    let previousHash = "GENESIS";

    for (const event of this.events) {
      const content = JSON.stringify({
        caseId: event.caseId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        actorId: event.actorId,
        actorRole: event.actorRole,
        description: event.description,
        previousHash,
      });

      const expected = createHash("sha256").update(content).digest("hex");

      if (expected !== event.immutableHash) {
        tamperedEventIds.push(event.id);
      }

      previousHash = event.immutableHash;
    }

    return {
      valid: tamperedEventIds.length === 0,
      tamperedEventIds,
    };
  }

  /**
   * Generate a public transparency summary for a case — suitable for
   * publication without exposing sensitive personal identifiers.
   */
  publicSummary(caseId: string): {
    caseId: string;
    totalEvents: number;
    eventTypes: Record<TransparencyEventType, number>;
    chainIntegrity: "VERIFIED" | "COMPROMISED";
    firstEventAt: string | null;
    lastEventAt: string | null;
  } {
    const caseEvents = this.getEventsByCase(caseId);
    const counts: Record<string, number> = {};

    for (const e of caseEvents) {
      counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
    }

    const { valid } = this.verifyIntegrity();

    return {
      caseId,
      totalEvents: caseEvents.length,
      eventTypes: counts as Record<TransparencyEventType, number>,
      chainIntegrity: valid ? "VERIFIED" : "COMPROMISED",
      firstEventAt: caseEvents[0]?.timestamp ?? null,
      lastEventAt: caseEvents[caseEvents.length - 1]?.timestamp ?? null,
    };
  }
}

export default TransparencyLedger;
