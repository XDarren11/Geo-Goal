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
import { Team } from "./Team";
import { User } from "./User";

@Table({ tableName: "match_events" })
export class MatchEvent extends Model {
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

  @ForeignKey(() => Team)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare teamId: number | null;

  @BelongsTo(() => Team)
  declare team: Team;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare playerId: number | null;

  @BelongsTo(() => User, "playerId")
  declare player: User;

  @Column({ type: DataType.STRING, allowNull: false })
  declare eventType:
    | "goal"
    | "own_goal"
    | "penalty_scored"
    | "penalty_missed"
    | "yellow_card"
    | "red_card"
    | "substitution"
    | "foul"
    | "offside"
    | "var_review";

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare minute: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare extraMinute: number | null;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  declare metadata: Record<string, unknown>;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare recordedBy: number | null;

  @BelongsTo(() => User, "recordedBy")
  declare recordedByUser: User;
}
