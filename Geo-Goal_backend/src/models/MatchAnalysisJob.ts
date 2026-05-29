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

@Table({ tableName: "match_analysis_jobs" })
export class MatchAnalysisJob extends Model {
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

  @Column({
    type: DataType.ENUM("uploaded", "annotating", "queued", "processing", "completed", "failed"),
    allowNull: false,
    defaultValue: "uploaded",
  })
  declare status: "uploaded" | "annotating" | "queued" | "processing" | "completed" | "failed";

  @Column({ type: DataType.STRING, allowNull: true })
  declare videoPath: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare videoFilename: string | null;

  @Column({ type: DataType.STRING(2048), allowNull: true })
  declare videoSupabaseUrl: string | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare srcPts: Array<{ x: number; y: number }> | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare playerTags: Array<{ x: number; y: number; label: "home" | "away" | "ball" }> | null;

  @Column({ type: DataType.JSONB, allowNull: true })
  declare identityMap: Record<string, number> | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare progress: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare currentStep: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare framesProcessed: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare totalFrames: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare pid: number | null;

  /** Primer fotograma del video (base64 JPEG) — guardado al confirmar el upload directo a Supabase */
  @Column({ type: DataType.TEXT, allowNull: true })
  declare firstFrame: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare error: string | null;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare createdBy: number | null;

  @BelongsTo(() => User, "createdBy")
  declare createdByUser: User;
}
