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

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare matchTimestampSec: number | null;

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

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare relatedPlayerId: number | null;

  @BelongsTo(() => User, "relatedPlayerId")
  declare relatedPlayer: User;

  @Column({ type: DataType.STRING, allowNull: false })
  declare eventType:
    | "goal"
    | "own_goal"
    | "penalty_scored"
    | "penalty_missed"
    | "pass"
    | "key_pass"
    | "shot"
    | "tackle"
    | "recovery"
    | "interception"
    | "clearance"
    | "dribble"
    | "cross"
    | "corner_won"
    | "yellow_card"
    | "red_card"
    | "substitution"
    | "foul"
    | "offside"
    | "var_review";

  @Column({ type: DataType.STRING, allowNull: true })
  declare outcome: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare minute: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare extraMinute: number | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare xStart: number | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare yStart: number | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare xEnd: number | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare yEnd: number | null;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: "manual" })
  declare source: "manual" | "inferred" | "video" | "simulated";

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 1 })
  declare confidence: number;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  declare metadata: Record<string, unknown>;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare recordedBy: number | null;

  @BelongsTo(() => User, "recordedBy")
  declare recordedByUser: User;
}
