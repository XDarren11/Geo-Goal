import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { League } from './League';
import { User } from './User';

@Table({ tableName: 'league_invitations', timestamps: true, paranoid: false })
export class LeagueInvitation extends Model {
  @Column({ type: DataType.STRING, unique: true, allowNull: false })
  declare code: string;

  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare leagueId: number;

  @BelongsTo(() => League)
  declare league: League;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare createdBy: number;

  @BelongsTo(() => User, 'createdBy')
  declare creator: User;

  @Column({ type: DataType.DATE, allowNull: true })
  declare expiresAt: Date | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare usesCount: number;

  @Column({ type: DataType.INTEGER, defaultValue: 100 })
  declare maxUses: number | null; // null = ilimitado
}
