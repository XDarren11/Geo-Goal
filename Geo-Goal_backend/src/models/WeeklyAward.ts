import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from "sequelize-typescript";
import { League } from "./League";
import { User } from "./User";
import { Team } from "./Team";

@Table({ tableName: "weekly_awards" })
export class WeeklyAward extends Model {
  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare leagueId: number;

  @BelongsTo(() => League)
  declare league: League;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare weekStart: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare weekEnd: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare playerId: number;

  @BelongsTo(() => User, "playerId")
  declare player: User;

  @ForeignKey(() => Team)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare teamId: number;

  @BelongsTo(() => Team)
  declare team: Team;

  @Column({ type: DataType.FLOAT, allowNull: false })
  declare avgRating: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare matchesInWeek: number;
}

