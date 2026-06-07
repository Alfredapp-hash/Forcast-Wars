import type { ApprovalEvent, ApprovalId, ArkheEvent, RiskClass } from "@arkhe/contracts";
import { createApprovalId, createEventId, createSpanId, createTraceId, SCHEMA_VERSION } from "@arkhe/contracts";

export interface ApprovalRequestInput {
  missionId?: string;
  agentId: string;
  action: string;
  summary: string;
  riskClass: RiskClass;
  evidenceRefs?: string[];
}

export class ApprovalGate {
  private readonly waiters = new Map<ApprovalId, (granted: boolean) => void>();

  constructor(private readonly publish: (event: ArkheEvent) => Promise<void>) {}

  async request(input: ApprovalRequestInput, timeoutMs = 120_000): Promise<boolean> {
    const approvalId = createApprovalId();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + timeoutMs).toISOString();

    await this.publish({
      id: createEventId(),
      ts: now,
      schemaVersion: SCHEMA_VERSION,
      missionId: input.missionId as never,
      agentId: input.agentId as never,
      trace: { traceId: createTraceId(), spanId: createSpanId() },
      eventType: "approval.requested",
      payload: {
        approvalId,
        status: "pending",
        riskClass: input.riskClass,
        action: input.action,
        summary: input.summary,
        evidenceRefs: input.evidenceRefs,
        requestedByAgentId: input.agentId as never,
        expiresAt,
      },
    });

    if (process.env.ARKHE_AUTO_APPROVE === "1") {
      await this.resolve(approvalId, true);
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.waiters.delete(approvalId);
        void this.publish(expiredEvent(approvalId, input));
        resolve(false);
      }, timeoutMs);

      this.waiters.set(approvalId, (granted) => {
        clearTimeout(timer);
        resolve(granted);
      });
    });
  }

  async resolve(approvalId: ApprovalId, granted: boolean): Promise<void> {
    const waiter = this.waiters.get(approvalId);
    if (waiter) {
      this.waiters.delete(approvalId);
    }

    await this.publish({
      id: createEventId(),
      ts: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      eventType: granted ? "approval.granted" : "approval.denied",
      payload: {
        approvalId,
        status: granted ? "approved" : "denied",
        riskClass: "orange",
        action: "user_review",
        summary: granted ? "User approved the pending action." : "User denied the pending action.",
        requestedByAgentId: "agt_director_01" as never,
        resolvedBy: process.env.ARKHE_AUTO_APPROVE === "1" ? "policy" : "user",
      },
    });

    waiter?.(granted);
  }
}

function expiredEvent(approvalId: ApprovalId, input: ApprovalRequestInput): ApprovalEvent {
  return {
    id: createEventId(),
    ts: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    eventType: "approval.expired",
    payload: {
      approvalId,
      status: "expired",
      riskClass: input.riskClass,
      action: input.action,
      summary: input.summary,
      requestedByAgentId: input.agentId as never,
      resolvedBy: "timeout",
    },
  };
}
