import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./User";

export type FavoriteEntityType = "team" | "player" | "coach" | "league";

@Table({
  tableName: "user_favorites",
  indexes: [
    { unique: true, fields: ["userId", "entityType", "entityId"] },
    { fields: ["userId"] },
    { fields: ["entityType", "entityId"] },
  ],
})
export class UserFavorite extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare entityType: FavoriteEntityType;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare entityId: number;

  @Column({ type: DataType.STRING(80), allowNull: true })
  declare label: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare sortOrder: number;
}
