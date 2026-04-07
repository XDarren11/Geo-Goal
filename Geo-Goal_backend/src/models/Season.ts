import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Default,
} from "sequelize-typescript";
import { League } from "./League";
import { User } from "./User";
import { Match } from "./Match";
import { TeamLeagueStat } from "./TeamLeagueStat";

@Table({ tableName: "seasons" })
export class Season extends Model {
  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare leagueId: number;

  @BelongsTo(() => League)
  declare league: League;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare year: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare startDate: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare endDate: string;

  @Default("draft")
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare status: "draft" | "active" | "finished" | "archived";

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare isCurrent: boolean;

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

  @HasMany(() => Match)
  declare matches: Match[];

  @HasMany(() => TeamLeagueStat)
  declare stats: TeamLeagueStat[];
}
