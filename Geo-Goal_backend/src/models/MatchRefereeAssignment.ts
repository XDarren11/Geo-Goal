import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Match } from "./Match";
import { League } from "./League";
import { User } from "./User";

@Table({ tableName: "match_referee_assignments" })
export class MatchRefereeAssignment extends Model {
  @ForeignKey(() => Match)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare matchId: number;

  @BelongsTo(() => Match)
  declare match: Match;

  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare leagueId: number;

  @BelongsTo(() => League)
  declare league: League;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare refereeUserId: number;

  @BelongsTo(() => User, "refereeUserId")
  declare refereeUser: User;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare assignedBy: number | null;

  @BelongsTo(() => User, "assignedBy")
  declare assignedByUser: User;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: "assigned" })
  declare status: "assigned" | "checked_in" | "closed";
}
