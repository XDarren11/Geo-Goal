import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./User";

@Table({
  tableName: "device_tokens",
  indexes: [
    { unique: true, fields: ["token"] },
    { fields: ["userId"] },
  ],
})
export class DeviceToken extends Model {
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  // ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx] — formato Expo
  @Column({ type: DataType.STRING(255), allowNull: false })
  declare token: string;

  @Column({
    type: DataType.ENUM("ios", "android", "web"),
    allowNull: false,
  })
  declare platform: "ios" | "android" | "web";

  // Si Expo devuelve DeviceNotRegistered, marcamos como inactivo para no seguir enviando
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isActive: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  declare lastUsedAt: Date | null;
}

