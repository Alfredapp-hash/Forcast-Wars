export type MessageSource = 'voice' | 'dashboard' | 'agent' | 'webhook' | 'system';
export type MessageRole = 'user' | 'agent' | 'system' | 'hermes';
export type MessageStatus = 'received' | 'routing' | 'dispatched' | 'completed' | 'failed';
export type DecisionType =
  | 'dispatch_agent'
  | 'dispatch_tool'
  | 'notify'
  | 'await_approval'
  | 'reject';
export type NotificationChannel = 'email' | 'push' | 'voice' | 'dashboard' | 'sms';
export type CapabilityKind = 'agent' | 'tool' | 'integration';
export type CapabilityStatus = 'dormant' | 'active' | 'overloaded' | 'offline';
export type RiskClass = 'green' | 'yellow' | 'orange' | 'red';
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface HermesEnvelope {
  id?: string;
  threadId?: string;
  missionId?: string;
  source: MessageSource;
  role: MessageRole;
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
  routingHint?: string;
}

export interface HermesDecision {
  type: DecisionType;
  targetId?: string;
  channel?: NotificationChannel;
  payload: Record<string, unknown>;
}

export interface CapabilityRegistration {
  id: string;
  name: string;
  kind: CapabilityKind;
  roles: string[];
  skills: string[];
  status?: CapabilityStatus;
  priorityLayer?: number;
  preferredModel?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPayload {
  channel: NotificationChannel;
  recipient: string;
  templateId?: string;
  data: Record<string, unknown>;
  priority?: NotificationPriority;
  scheduledAt?: string;
}

export interface ApprovalRequest {
  approvalId: string;
  riskClass: RiskClass;
  action: string;
  summary: string;
  requestedBy: string;
  missionId?: string;
  expiresAt: string;
}
