import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
} from "sequelize-typescript";
import { League } from "./League";
import { Season } from "./Season";
import { Match } from "./Match";
import { User } from "./User";

@Table({ tableName: "news" })
export class News extends Model {
  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare leagueId: number | null;

  @BelongsTo(() => League)
  declare league: League;

  @ForeignKey(() => Season)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare seasonId: number | null;

  @BelongsTo(() => Season)
  declare season: Season;

  @ForeignKey(() => Match)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare matchId: number | null;

  @BelongsTo(() => Match)
  declare match: Match;

  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare summary: string;

  @Default("league")
  @Column({ type: DataType.ENUM("match", "season", "league"), allowNull: false })
  declare type: "match" | "season" | "league";

  @Default(true)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare isPublished: boolean;

  @Column({ type: DataType.STRING, allowNull: true, unique: true })
  declare source: string | null;

  @Default({})
  @Column({ type: DataType.JSONB, allowNull: false })
  declare payload: Record<string, unknown>;

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
