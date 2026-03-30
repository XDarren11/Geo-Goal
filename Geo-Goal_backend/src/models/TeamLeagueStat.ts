import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Team } from './Team';
import { League } from './League';

@Table({ tableName: 'team_league_stats' })
export class TeamLeagueStat extends Model {
    
    @ForeignKey(() => Team)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare teamId: number;

    @BelongsTo(() => Team)
    declare team: Team;

    @ForeignKey(() => League)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare leagueId: number;

    @BelongsTo(() => League)
    declare league: League;

    // --- ESTADÍSTICAS ESPECÍFICAS DE ESTA LIGA ---
    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare points: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare gamesPlayed: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare wins: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare draws: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare losses: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare goalsFor: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare goalsAgainst: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare goalDifference: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare penaltyWins: number;
}