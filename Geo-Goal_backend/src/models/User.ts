import { Table, Column, Model, DataType, Default, HasMany, BelongsToMany } from 'sequelize-typescript';
import { League } from './League';
import { Team } from './Team';
import { TeamMember } from './TeamMember';
import { LeagueAdmin } from './LeagueAdmin';
import { MatchSquadPlayer } from './MatchSquadPlayer';

@Table({ tableName: 'users' })
export class User extends Model {
    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    declare email: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare password: string;

    @Default(false)
    @Column({ type: DataType.BOOLEAN })
    declare confirmed: boolean;

    @Column({ type: DataType.STRING })
    declare token: string;

    @Default('player')
    @Column({ type: DataType.STRING, allowNull: false })
    declare role: string;

    // --- RELACIONES ---

    // 1. ADMIN: Sus ligas
    @HasMany(() => League)
    declare leagues: League[];

    // 2. ENTRENADOR: Sus equipos gestionados
    @HasMany(() => Team, 'trainerId')
    declare teamsManaged: Team[];

    // 3. JUGADOR: Equipos donde juega
    @BelongsToMany(() => Team, () => TeamMember)
    declare teamsPlaying: Team[];

    // 4. ADMIN DE LIGA: asignaciones por liga
    @HasMany(() => LeagueAdmin, 'userId')
    declare leagueAdminAssignments: LeagueAdmin[];

    @HasMany(() => LeagueAdmin, 'assignedBy')
    declare adminAssignmentsMade: LeagueAdmin[];

    @HasMany(() => MatchSquadPlayer, 'playerId')
    declare matchSquadEntries: MatchSquadPlayer[];
}