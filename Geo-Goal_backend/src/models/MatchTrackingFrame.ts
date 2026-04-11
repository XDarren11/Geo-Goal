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

@Table({ tableName: "match_tracking_frames" })
export class MatchTrackingFrame extends Model {
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

  @Column({ type: DataType.BIGINT, allowNull: false })
  declare timestampMs: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare period: "pre" | "1H" | "HT" | "2H" | "ET" | "post" | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare ballX: number | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare ballY: number | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  declare ballZ: number | null;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare players: Array<Record<string, unknown>>;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: "manual" })
  declare source: "manual" | "inferred" | "video" | "simulated";

  @Column({ type: DataType.FLOAT, allowNull: false, defaultValue: 1 })
  declare confidence: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare recordedBy: number | null;

  @BelongsTo(() => User, "recordedBy")
  declare recordedByUser: User;
}
