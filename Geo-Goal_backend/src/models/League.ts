import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Team } from './Team';
import { User } from './User';
import { TeamLeagueStat } from './TeamLeagueStat';
import { LeagueAdmin } from './LeagueAdmin';
import { Field } from './Field';
import { Season } from './Season';
import { LeagueInvitation } from './LeagueInvitation';

@Table({ tableName: 'leagues', paranoid: true })
export class League extends Model {
    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @Column({ type: DataType.STRING })
    declare description: string;

    // Dueño de la Liga (Admin)
    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER })
    declare managerId: number;

    @BelongsTo(() => User)
    declare manager: User;

    // Relación: Una liga tiene muchos equipos
    @HasMany(() => Team)
    declare teams: Team[];

    @HasMany(() => TeamLeagueStat)
    declare teamStats: TeamLeagueStat[];

    @HasMany(() => LeagueAdmin)
    declare leagueAdmins: LeagueAdmin[];

    @HasMany(() => Field)
    declare fields: Field[];

    @HasMany(() => Season)
    declare seasons: Season[];

    @HasMany(() => LeagueInvitation)
    declare invitations: LeagueInvitation[];
}