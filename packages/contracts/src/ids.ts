import { randomBytes } from "node:crypto";

type IdPrefix =
  | "mis"
  | "agt"
  | "wsp"
  | "apr"
  | "trc"
  | "spn"
  | "evt"
  | "tcl";

function generateId(prefix: IdPrefix): string {
  const bytes = randomBytes(12).toString("base64url");
  return `${prefix}_${bytes}`;
}

export function createMissionId() {
  return generateId("mis") as `mis_${string}`;
}

export function createAgentId() {
  return generateId("agt") as `agt_${string}`;
}

export function createWorkspaceId() {
  return generateId("wsp") as `wsp_${string}`;
}

export function createApprovalId() {
  return generateId("apr") as `apr_${string}`;
}

export function createTraceId() {
  return generateId("trc") as `trc_${string}`;
}

export function createSpanId() {
  return generateId("spn") as `spn_${string}`;
}

export function createEventId() {
  return generateId("evt") as `evt_${string}`;
}

export function createToolCallId() {
  return generateId("tcl") as `tcl_${string}`;
}
