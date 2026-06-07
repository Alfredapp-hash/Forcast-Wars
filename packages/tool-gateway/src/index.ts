import type { PermissionEnvelope, RiskClass } from "@arkhe/contracts";

export const TOOL_GATEWAY_VERSION = "0.1.0";

export interface ToolRequest {
  toolName: string;
  riskClass: RiskClass;
  input?: Record<string, unknown>;
}

export interface ToolDecision {
  allowed: boolean;
  approvalRequired: boolean;
  reason: string;
}

const RISK_ORDER: RiskClass[] = ["green", "yellow", "orange", "red"];

export class ToolGateway {
  decide(request: ToolRequest, permissions: PermissionEnvelope): ToolDecision {
    if (!permissions.allowedTools.includes(request.toolName)) {
      return {
        allowed: false,
        approvalRequired: false,
        reason: `Tool ${request.toolName} is outside the agent permission envelope.`,
      };
    }

    if (riskIndex(request.riskClass) > riskIndex(permissions.riskClass)) {
      return {
        allowed: false,
        approvalRequired: request.riskClass === "orange" || request.riskClass === "red",
        reason: `Tool risk ${request.riskClass} exceeds agent risk ${permissions.riskClass}.`,
      };
    }

    const threshold = permissions.requiresApprovalAbove ?? "orange";
    const approvalRequired = riskIndex(request.riskClass) >= riskIndex(threshold);

    return {
      allowed: true,
      approvalRequired,
      reason: approvalRequired ? "Human approval required by risk policy." : "Allowed by permission envelope.",
    };
  }
}

function riskIndex(risk: RiskClass): number {
  return RISK_ORDER.indexOf(risk);
}
