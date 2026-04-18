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
import { User } from "./User";

@Table({ tableName: "match_squad_players" })
export class MatchSquadPlayer extends Model {
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

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare playerId: number;

  @BelongsTo(() => User, "playerId")
  declare player: User;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: "roster" })
  declare squadRole: "starter" | "bench" | "roster" | "unavailable";

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isAvailable: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isCaptain: boolean;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare jerseyNumber: number | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare position: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare minutesPlanned: number | null;

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
