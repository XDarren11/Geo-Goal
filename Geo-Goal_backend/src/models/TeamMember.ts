// 👇 1. Agrega BelongsTo a la importación
import { Table, Column, Model, ForeignKey, DataType, BelongsTo } from 'sequelize-typescript';
import { Team } from './Team';
import { User } from './User';

@Table({
    tableName: 'team_members'
})
export class TeamMember extends Model {
    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER
    })
    declare userId: number;

    // 👇 2. AGREGA ESTO PARA EL USUARIO
    @BelongsTo(() => User)
    declare user: User;

    @ForeignKey(() => Team)
    @Column({
        type: DataType.INTEGER
    })
    declare teamId: number;

    // 👇 3. DE UNA VEZ AGREGA ESTO PARA EL EQUIPO (Buenas prácticas)
    @BelongsTo(() => Team)
    declare team: Team;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare playerName: string | null;

    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    declare jerseyNumber: number | null;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare preferredPosition: string | null;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare avatarUrl: string | null;
}