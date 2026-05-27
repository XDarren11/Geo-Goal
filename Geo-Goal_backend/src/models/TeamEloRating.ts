import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Team } from "./Team";

@Table({ tableName: "team_elo_ratings" })
export class TeamEloRating extends Model {
  @ForeignKey(() => Team)
  @Column({ type: DataType.INTEGER, primaryKey: true })
  declare teamId: number;

  @BelongsTo(() => Team)
  declare team: Team;

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 1500 })
  declare rating: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare gamesPlayed: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare lastMatchId: number | null;

  /** Últimas 50 entradas: { matchId, before, after, opponent, result, date } */
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare ratingHistory: Array<Record<string, unknown>>;
}

