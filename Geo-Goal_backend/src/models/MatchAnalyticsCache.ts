import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Match } from "./Match";

@Table({ tableName: "match_analytics_cache", timestamps: true })
export class MatchAnalyticsCache extends Model {
  @ForeignKey(() => Match)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare matchId: number;

  @BelongsTo(() => Match)
  declare match: Match;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  declare payload: Record<string, unknown>;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  declare version: number;

  @Column({ type: DataType.DATE, allowNull: false })
  declare computedAt: Date;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare framesAtComputeTime: number;
}

