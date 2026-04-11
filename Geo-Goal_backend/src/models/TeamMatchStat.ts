import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Match } from "./Match";
import { Team } from "./Team";

@Table({ tableName: "team_match_stats" })
export class TeamMatchStat extends Model {
  @ForeignKey(() => Match)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare matchId: number;

  @BelongsTo(() => Match)
  declare match: Match;

  @ForeignKey(() => Team)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare teamId: number;

  @BelongsTo(() => Team)
  declare team: Team;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare minutesPlayed: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare passes: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare passesCompleted: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare keyPasses: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare shots: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare shotsOnTarget: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare goals: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare assists: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare yellowCards: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare redCards: number;

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 0 })
  declare distanceMeters: number;

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 0 })
  declare avgRating: number;
}
