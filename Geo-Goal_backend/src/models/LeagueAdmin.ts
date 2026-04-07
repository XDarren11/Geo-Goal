import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { League } from "./League";
import { User } from "./User";

@Table({ tableName: "league_admins" })
export class LeagueAdmin extends Model {
  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare leagueId: number;

  @BelongsTo(() => League)
  declare league: League;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @BelongsTo(() => User, "userId")
  declare adminUser: User;

  @Column({
    type: DataType.ENUM("principal", "assistant"),
    allowNull: false,
  })
  declare leagueRole: "principal" | "assistant";

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare assignedBy: number | null;

  @BelongsTo(() => User, "assignedBy")
  declare assignedByUser: User;
}
