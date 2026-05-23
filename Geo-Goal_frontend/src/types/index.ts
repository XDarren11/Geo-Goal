import {z} from 'zod'

// Auth y users
const authSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string(),
    password_confirmation: z.string(),
    token: z.string(),
    role: z.string()
})

type Auth = z.infer<typeof authSchema>
export type UserLoginForm = Pick<Auth, 'email' | 'password'>
export type UserRegistrationForm = Pick<Auth, 'email' | 'password' | 'password_confirmation' | 'name' | 'role'>
export type RequestConfirmationCodeForm = Pick<Auth, 'email'>
export type ConfirmToken = Pick<Auth, 'token'>
export type ForgotPasswordForm = Pick<Auth, 'email'>
export type NewPasswordForm = Pick<Auth, 'password' | 'password_confirmation'>

// User
export const userSchema = authSchema.pick({
    name: true,
    email: true,
    role: true
}).extend({
  id: z.number(),
  username: z.string().nullable().optional(),
  confirmed: z.boolean().optional()
})

export type User = z.infer<typeof userSchema>

export type Role = 'admin' | 'coach' | 'player' | 'referee'

export interface League {
  id: number
  name: string
  description?: string
  managerId?: number
  logoUrl?: string | null
  lineupMode?: 7 | 11
  teams?: Team[]
}

export interface PublicLeagueSummary {
  id: number
  name: string
  description?: string
  createdAt?: string
}

export interface PublicNewsItem {
  id: string
  title: string
  summary: string
  type: 'match' | 'season' | 'league'
  createdAt: string
  leagueId?: number
  leagueName?: string
  matchId?: number
}

export interface Team {
  id: number
  name: string
  lat?: number
  lng?: number
  fieldAddress?: string
  logoUrl?: string | null
  leagueId?: number | null
  trainerId?: number
  league?: Pick<League, 'id' | 'name'>
  trainer?: Pick<User, 'id' | 'name' | 'email'>
  stats?: {
    playedMatches: number
    wins: number
    draws: number
    losses: number
    points: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
  }
  recentMatches?: Match[]
}

export interface Match {
  id: number
  leagueId: number | null
  seasonId?: number | null
  type?: 'league' | 'friendly'
  homeTeamId: number
  awayTeamId: number
  date?: string | null
  roundName: string
  homeScore: number
  awayScore: number
  played: boolean
  homeTeam?: Team
  awayTeam?: Team
  league?: Pick<League, 'id' | 'name' | 'lineupMode'>
  lat?: number;
  lng?: number;
  fieldAddress?: string;
  location?: {
    lat: number
    lng: number
    fieldAddress?: string
  } | null

  detail?: {
    field?: {
      id?: number;
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      lat?: number;
      lng?: number;
    }
  };
}

export interface MatchDetailLineupEntry {
  userId?: number
  name?: string
  number?: number
  position?: string
  [key: string]: unknown
}

export interface MatchSquadPlayerView {
  id: number
  name: string | null
  email: string | null
  role: string | null
  squadRole: 'starter' | 'bench' | 'roster' | 'unavailable'
  isAvailable: boolean
  isCaptain: boolean
  jerseyNumber: number | null
  position: string | null
  minutesPlanned: number | null
  notes: string | null
}

export interface MatchSquadTeamView {
  starters: MatchSquadPlayerView[]
  bench: MatchSquadPlayerView[]
  roster: MatchSquadPlayerView[]
  unavailable: MatchSquadPlayerView[]
  totals: {
    totalRoster: number
    available: number
    unavailable: number
  }
}

export interface PublicMatchDetail {
  id?: number
  matchId?: number
  kickoffTime?: string | null
  durationMinutes?: number
  endTime?: string | null
  matchDay?: string | null
  fieldId?: number | null
  field?: {
    id: number
    name: string
    address?: string
    city?: string | null
    state?: string | null
    country?: string | null
    lat?: number
    lng?: number
  } | null
  homeCoachId?: number | null
  awayCoachId?: number | null
  homeCoach?: { id: number; name: string; email?: string } | null
  awayCoach?: { id: number; name: string; email?: string } | null
  homeStartingXI?: MatchDetailLineupEntry[]
  awayStartingXI?: MatchDetailLineupEntry[]
  homeBench?: MatchDetailLineupEntry[]
  awayBench?: MatchDetailLineupEntry[]
  homeFormation?: string | null
  awayFormation?: string | null
  squads?: {
    home: MatchSquadTeamView
    away: MatchSquadTeamView
  }
  referee?: string | null
  weather?: string | null
  attendance?: number | null
  notes?: string | null
}

export interface PublicMatchDetailResponse {
  match: Match
  detail: PublicMatchDetail
}

export interface PublicLeagueDetail {
  league: League
  currentSeason?: Season | null
  standings: PublicStanding[]
  fixture: FixtureByRound
  fixtureWithLocations: Array<Match>
  teams: Array<Team & { trainer?: { id: number; name: string; email: string } }>
  fields: AdminField[]
  recentMatches: Match[]
  seasons: Season[]
  news: PublicNewsItem[]
}

export interface PublicStanding {
  id: number
  leagueId: number
  seasonId?: number | null
  points: number
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  penaltyWins: number
  team?: Pick<Team, 'id' | 'name' | 'logoUrl'>
  season?: Pick<Season, 'id' | 'name' | 'year' | 'status' | 'isCurrent'>
}

export type FixtureByRound = Record<string, Match[]>

export interface Player {
  id: number
  name: string
  email: string
  playerName?: string | null
  jerseyNumber?: number | null
  preferredPosition?: string | null
  avatarUrl?: string | null
}

export interface AdminUser {
  id: number
  name: string
  email: string
  role: Role
  confirmed: boolean
  createdAt?: string
  updatedAt?: string
}

export interface LeagueAdminAssignment {
  id: number
  leagueId: number
  userId: number
  leagueRole: 'principal' | 'assistant'
  assignedBy?: number | null
  adminUser?: Pick<AdminUser, 'id' | 'name' | 'email' | 'role'>
}

export interface AdminField {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  city?: string | null
  state?: string | null
  country?: string | null
  capacity?: number | null
  isActive: boolean
  notes?: string | null
  leagueId?: number | null
  teamId?: number | null
  league?: Pick<League, 'id' | 'name'>
  team?: Pick<Team, 'id' | 'name'>
}

export type SeasonStatus = 'draft' | 'active' | 'finished' | 'archived'

export interface Season {
  id: number
  leagueId: number
  name: string
  year: number
  startDate: string
  endDate: string
  status: SeasonStatus
  isCurrent: boolean
  createdBy?: number | null
  updatedBy?: number | null
  createdAt?: string
  updatedAt?: string
  league?: Pick<League, 'id' | 'name' | 'managerId'>
}

export interface AuditLog {
  id: number
  actorUserId?: number | null
  leagueId?: number | null
  seasonId?: number | null
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete' | 'status_change' | 'manual_fix'
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
  reason?: string | null
  ip?: string | null
  userAgent?: string | null
  createdAt?: string
  actor?: Pick<AdminUser, 'id' | 'name' | 'email' | 'role'>
  league?: Pick<League, 'id' | 'name'>
  season?: Pick<Season, 'id' | 'name' | 'year'>
}

export interface AdminDashboardLeagueSummary {
  id: number
  name: string
  description?: string
  managerId?: number
  teamsCount: number
}

export interface AdminDashboardMatch extends Match {
  league?: Pick<League, 'id' | 'name'>
}

export interface AdminDashboardLeagueAdmins {
  leagueId: number
  leagueName: string
  managerId?: number
  principal?: Pick<AdminUser, 'id' | 'name' | 'email' | 'role'> | null
  assistants: Array<Pick<AdminUser, 'id' | 'name' | 'email' | 'role'>>
  referees: Array<Pick<AdminUser, 'id' | 'name' | 'email' | 'role'>>
}

export interface AdminDashboardGoalStat {
  teamId: number
  teamName: string
  leagueId: number
  leagueName: string
  goalsFor: number
  goalsAgainst: number
}

export interface AdminDashboardDisciplineStat {
  teamId: number
  teamName: string
  leagueId: number
  leagueName: string
  yellowCards: number
  redCards: number
}

export interface AdminDashboardSummary {
  stats: {
    leagues: number
    nextMatches: number
    assignedAdmins: number
    recentResults: number
  }
  leagues: AdminDashboardLeagueSummary[]
  nextMatches: AdminDashboardMatch[]
  adminsByLeague: AdminDashboardLeagueAdmins[]
  recentResults: AdminDashboardMatch[]
  goalStatsByTeam: AdminDashboardGoalStat[]
  disciplineByTeam: AdminDashboardDisciplineStat[]
  news: PublicNewsItem[]
}

export interface CoachDashboardUpcomingMatch extends Match {
  teamId: number
  teamName: string
  opponentName: string
  leagueName: string
}

export interface CoachDashboardRecentResult extends Match {
  result: 'W' | 'D' | 'L'
}

export interface CoachDashboardTopPlayer {
  playerId: number
  name: string
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  minutes: number
}

export interface CoachDashboardChecklistItem {
  matchId: number
  teamId: number
  teamName: string
  opponentName: string
  leagueName: string
  roundName: string
  date?: string | null
  checklist: {
    convocatoria: boolean
    alineacion: boolean
    cancha: boolean
    horario: boolean
  }
}

export interface CoachDashboardGoalsByTeam {
  teamId: number
  teamName: string
  goalsFor: number
  goalsAgainst: number
}

export interface CoachDashboardCardsByTeam {
  teamId: number
  teamName: string
  yellowCards: number
  redCards: number
}

export interface CoachDashboardSummary {
  stats: {
    playedMatches: number
    points: number
    goalsFor: number
    goalsAgainst: number
    streak: string
  }
  upcomingMatches: CoachDashboardUpcomingMatch[]
  recentResults: CoachDashboardRecentResult[]
  trend: {
    W: number
    D: number
    L: number
  }
  topPlayers: CoachDashboardTopPlayer[]
  preMatchChecklist: CoachDashboardChecklistItem[]
  goalsByTeam: CoachDashboardGoalsByTeam[]
  cardsByTeam: CoachDashboardCardsByTeam[]
  news: PublicNewsItem[]
}

export interface PlayerDashboardRecentEvent {
  id: number
  eventType: string
  minute: number
  extraMinute?: number | null
  metadata?: Record<string, unknown>
  createdAt?: string
  match?: Match
}

export interface PlayerDashboardActionableNotification {
  id: number
  title: string
  message: string
  type: string
  payload?: Record<string, unknown>
  actionUrl?: string | null
  readAt?: string | null
  createdAt?: string
}

export interface PlayerDashboardSummary {
  nextMatch: (Match & {
    fieldId?: number | null
    fieldAddress?: string | null
  }) | null
  recentTeamResults: Match[]
  personalPerformance: {
    averageRating: number
    minutes: number
    contributions: number
    goals: number
    assists: number
    yellowCards: number
    redCards: number
    radar: Array<{ metric: string; value: number }>
  }
  recentEvents: PlayerDashboardRecentEvent[]
  actionableNotifications: PlayerDashboardActionableNotification[]
  performanceTrend: Array<{
    matchId: number
    label: string
    rating: number
    minutes: number
    contributions: number
  }>
  achievements: Array<{
    key: string
    title: string
    description: string
    unlocked: boolean
  }>
  news: PublicNewsItem[]
}

export interface NotificationItem {
  id: number
  userId: number
  type: string
  title: string
  message: string
  payload?: Record<string, unknown>
  readAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface MatchAnalyticsPlayerStat {
  id: number
  matchId: number
  teamId: number
  playerId: number
  minutesPlayed: number
  passes: number
  passesCompleted: number
  keyPasses: number
  shots: number
  shotsOnTarget: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  distanceMeters: number
  rating: number
  player?: Pick<User, 'id' | 'name' | 'email'>
  team?: Pick<Team, 'id' | 'name'>
}

export interface MatchAnalyticsTeamStat {
  id: number
  matchId: number
  teamId: number
  minutesPlayed: number
  passes: number
  passesCompleted: number
  keyPasses: number
  shots: number
  shotsOnTarget: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  distanceMeters: number
  avgRating: number
  team?: Pick<Team, 'id' | 'name'>
}

export interface MatchAnalyticsResponse {
  match: Match
  summary: {
    totalPlayersWithStats: number
    totalPassEdges: number
    totalSpatialEvents: number
  }
  topPlayers: MatchAnalyticsPlayerStat[]
  playerStats: MatchAnalyticsPlayerStat[]
  teamStats: MatchAnalyticsTeamStat[]
  passNetwork: Array<{
    teamId: number
    fromPlayerId: number
    toPlayerId: number
    count: number
  }>
  heatmaps: Array<{
    teamId: number
    playerId: number
    cells: Record<string, number>
  }>
  timelineEvents: Array<{
    id: number
    teamId?: number | null
    playerId?: number | null
    relatedPlayerId?: number | null
    eventType: string
    minute: number
    extraMinute?: number | null
    matchTimestampSec?: number | null
    xStart?: number | null
    yStart?: number | null
    xEnd?: number | null
    yEnd?: number | null
    outcome?: string | null
    source?: string
    confidence?: number
    metadata?: Record<string, unknown>
    createdAt?: string
  }>
  trackingFrames: Array<{
    id: number
    timestampMs: number
    period?: string | null
    ballX?: number | null
    ballY?: number | null
    ballZ?: number | null
    players: Array<Record<string, unknown>>
    source?: string
    confidence?: number
    createdAt?: string
  }>
}
