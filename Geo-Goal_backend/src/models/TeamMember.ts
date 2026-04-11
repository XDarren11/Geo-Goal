import { Table, Column, Model, ForeignKey, DataType } from 'sequelize-typescript';
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

    @ForeignKey(() => Team)
    @Column({
        type: DataType.INTEGER
    })
    declare teamId: number;

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
}