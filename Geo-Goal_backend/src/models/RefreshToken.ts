import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { User } from "./User";

@Table({ tableName: "refresh_tokens" })
export class RefreshToken extends Model {
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare tokenHash: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expiresAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  declare revokedAt: Date | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare replacedByTokenHash: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare revokedReason: string | null;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;
}

