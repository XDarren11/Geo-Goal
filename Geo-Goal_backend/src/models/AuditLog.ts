import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./User";
import { League } from "./League";
import { Season } from "./Season";

@Table({ tableName: "audit_logs", updatedAt: false })
export class AuditLog extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare actorUserId: number | null;

  @BelongsTo(() => User, "actorUserId")
  declare actor: User;

  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare leagueId: number | null;

  @BelongsTo(() => League)
  declare league: League;

  @ForeignKey(() => Season)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare seasonId: number | null;

  @BelongsTo(() => Season)
  declare season: Season;

  @Column({ type: DataType.STRING, allowNull: false })
  declare entityType: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare entityId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare action: "create" | "update" | "delete" | "status_change" | "manual_fix";

  @Column({ type: DataType.JSONB, allowNull: true })
  declare beforeData: Record<string, unknown> | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare afterData: Record<string, unknown> | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare reason: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare ip: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare userAgent: string | null;
}
