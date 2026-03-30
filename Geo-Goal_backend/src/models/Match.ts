import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { League } from './League';
import { Team } from './Team';

@Table({ tableName: 'matches' })
export class Match extends Model {
    
    @ForeignKey(() => League)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare leagueId: number;

    @BelongsTo(() => League)
    declare league: League;

    // Equipo Local
    @ForeignKey(() => Team)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare homeTeamId: number;

    @BelongsTo(() => Team, 'homeTeamId')
    declare homeTeam: Team;

    // Equipo Visitante
    @ForeignKey(() => Team)
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare awayTeamId: number;

    @BelongsTo(() => Team, 'awayTeamId')
    declare awayTeam: Team;

    // Detalles del juego
    @Column({ type: DataType.DATE, allowNull: true })
    declare date: Date;

    @Column({ type: DataType.STRING, allowNull: false })
    declare roundName: string; // Ej: "Jornada 1", "Octavos de Final"

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare homeScore: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare awayScore: number;

    @Column({ type: DataType.INTEGER, allowNull: true })
    declare homePenaltiesScore: number;

    @Column({ type: DataType.INTEGER, allowNull: true })
    declare awayPenaltiesScore: number;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare played: boolean;
}