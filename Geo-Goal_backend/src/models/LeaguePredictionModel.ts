import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { League } from "./League";

@Table({ tableName: "league_prediction_models" })
export class LeaguePredictionModel extends Model {
  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare leagueId: number;

  @BelongsTo(() => League)
  declare league: League;

  /** { [teamId]: { alpha: number, beta: number } } */
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  declare teamParams: Record<string, unknown>;

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 1.3 })
  declare homeAdvantage: number;

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: -0.1 })
  declare rho: number;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare loss: number | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare fittedAt: Date | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare matchesUsed: number;
}

