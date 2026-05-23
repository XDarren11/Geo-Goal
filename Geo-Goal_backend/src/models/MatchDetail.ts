import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Match } from "./Match";
import { Field } from "./Field";
import { User } from "./User";

@Table({ tableName: "match_details" })
export class MatchDetail extends Model {
  @ForeignKey(() => Match)
  @Column({ type: DataType.INTEGER, allowNull: false, unique: true })
  declare matchId: number;

  @BelongsTo(() => Match)
  declare match: Match;

  @Column({ type: DataType.DATE, allowNull: true })
  declare kickoffTime: Date | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 90 })
  declare durationMinutes: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare endTime: Date | null;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare matchDay: string | null;

  @ForeignKey(() => Field)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare fieldId: number | null;

  @BelongsTo(() => Field)
  declare field: Field;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare homeCoachId: number | null;

  @BelongsTo(() => User, "homeCoachId")
  declare homeCoach: User;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare awayCoachId: number | null;

  @BelongsTo(() => User, "awayCoachId")
  declare awayCoach: User;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare homeStartingXI: Array<Record<string, unknown>>;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare awayStartingXI: Array<Record<string, unknown>>;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare homeBench: Array<Record<string, unknown>>;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare awayBench: Array<Record<string, unknown>>;

  @Column({ type: DataType.STRING(10), allowNull: true })
  declare homeFormation: string | null;

  @Column({ type: DataType.STRING(10), allowNull: true })
  declare awayFormation: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare referee: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare weather: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare attendance: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: string | null;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare createdBy: number | null;

  @BelongsTo(() => User, "createdBy")
  declare createdByUser: User;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare updatedBy: number | null;

  @BelongsTo(() => User, "updatedBy")
  declare updatedByUser: User;
}
