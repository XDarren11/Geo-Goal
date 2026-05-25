import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./User";
import { Team } from "./Team";

@Table({
  tableName: "team_followers",
  indexes: [
    { unique: true, fields: ["userId", "teamId"] },
    { fields: ["teamId"] },
  ],
})
export class TeamFollower extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @ForeignKey(() => Team)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare teamId: number;

  @BelongsTo(() => Team)
  declare team: Team;
}

