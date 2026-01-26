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
}