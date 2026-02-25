import { Table, Column, Model, DataType, ForeignKey, BelongsTo, BelongsToMany } from 'sequelize-typescript';
import { User } from './User';
import { League } from './League';
import { TeamMember } from './TeamMember';

@Table({ tableName: 'teams' })
export class Team extends Model {
    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    // --- UBICACIÓN (Geolocalización) ---
    @Column({ type: DataType.FLOAT, allowNull: false })
    declare lat: number;

    @Column({ type: DataType.FLOAT, allowNull: false })
    declare lng: number;

    @Column({ type: DataType.STRING, allowNull: false })
    declare fieldAddress: string;

    // --- NUEVO CAMPO: ESCUDO ---
    @Column({ type: DataType.STRING, allowNull: true })
    declare logoUrl: string; // Guardaremos algo como: "escudo-123.jpg"

    // --- RELACIONES ---
    @ForeignKey(() => League)
    @Column({ type: DataType.INTEGER, allowNull: true })
    declare leagueId: number;

    @BelongsTo(() => League)
    declare league: League;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare trainerId: number;

    @BelongsTo(() => User, 'trainerId')
    declare trainer: User;

    @BelongsToMany(() => User, () => TeamMember)
    declare players: User[];
}