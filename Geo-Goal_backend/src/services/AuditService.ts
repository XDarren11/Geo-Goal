import { AuditLog } from "../models/AuditLog";

type AuditAction = "create" | "update" | "delete" | "status_change" | "manual_fix";

type AuditInput = {
  actorUserId?: number | null;
  leagueId?: number | null;
  seasonId?: number | null;
  entityType: string;
  entityId: string | number;
  action: AuditAction;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export class AuditService {
  static async log(input: AuditInput): Promise<void> {
    await AuditLog.create({
      actorUserId: input.actorUserId ?? null,
      leagueId: input.leagueId ?? null,
      seasonId: input.seasonId ?? null,
      entityType: input.entityType,
      entityId: String(input.entityId),
      action: input.action,
      beforeData: input.beforeData ?? null,
      afterData: input.afterData ?? null,
      reason: input.reason ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  }
}
