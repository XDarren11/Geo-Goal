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
    role: true,
}).extend({
  id: z.number(),
  username: z.string().nullable().optional(),
  confirmed: z.boolean().optional()
})

export type User = z.infer<typeof userSchema>
export type Role = 'admin' | 'coach' | 'player' | 'referee'

// League
export interface League {
  id: number
  name: string
  description?: string
  logoUrl?: string | null
  managerId?: number
  lineupMode?: 7 | 11
  refereeAssignmentMode?: 'manual' | 'auto'
  autoAssignWindowDays?: number
  teams?: Team[]
}

export interface Season {
  id: number
  leagueId?: number
  name: string
  year: number
  status?: string
  isCurrent?: boolean
  startDate?: string
  endDate?: string
}

// Team
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
}

// Match
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
}

export interface MatchDetailLineupEntry {
  userId?: number
  name?: string
  number?: number
  position?: string
  [key: string]: unknown
}

export interface PublicMatchDetail {
  matchId?: number
  kickoffTime?: string | null
  durationMinutes?: number
  endTime?: string | null
  matchDay?: string | null
  field?: {
    id?: number
    name?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    lat?: number | null
    lng?: number | null
  } | null
  homeStartingXI?: MatchDetailLineupEntry[]
  awayStartingXI?: MatchDetailLineupEntry[]
  homeBench?: MatchDetailLineupEntry[]
  awayBench?: MatchDetailLineupEntry[]
  homeFormation?: string | null
  awayFormation?: string | null
  referee?: string | null
  weather?: string | null
  attendance?: number | null
  notes?: string | null
}

export interface PublicMatchDetailResponse {
  match: Match
  detail: PublicMatchDetail
}

export interface MatchAnalyticsResponse {
  match?: {
    homeTeamId: number
    awayTeamId: number
  }
  summary: {
    totalPlayersWithStats: number
    totalPassEdges: number
    totalSpatialEvents: number
    totalFrames: number
  }
  passNetwork: Array<{
    teamId: number
    fromPlayerId: number
    toPlayerId: number
    count: number
  }>
  timelineEvents: Array<{
    id: number
    teamId?: number | null
    playerId?: number | null
    relatedPlayerId?: number | null
    eventType: string
    minute: number
    extraMinute?: number | null
    xStart?: number | null
    yStart?: number | null
    outcome?: string | null
    source?: string
    confidence?: number
  }>
  trackingFrames: Array<{
    id: number
    timestampMs: number
    period?: string | null
    ballX?: number | null
    ballY?: number | null
    ballZ?: number | null
    players: Array<TrackingFramePlayer>
    source?: string
    confidence?: number
  }>
}

export interface TrackingFramePlayer {
  playerId?: number | null
  teamId?: number | null
  x?: number | null
  y?: number | null
}

export interface PublicLeagueSummary {
  id: number
  name: string
  description?: string
  createdAt?: string
}

export interface PublicStanding {
  id?: number
  teamId: number
  leagueId: number
  points: number
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  team?: Pick<Team, 'id' | 'name' | 'logoUrl'>
}

export interface PublicLeagueDetail {
  league: League
  currentSeason?: Season | null
  standings: PublicStanding[]
  fixture: FixtureByRound
  fixtureWithLocations?: Array<Match & { location?: { lat: number; lng: number; fieldAddress?: string } | null }>
  teams?: Team[]
  fields?: Array<Record<string, unknown>>
  recentMatches?: Match[]
  seasons?: Season[]
  news?: Array<Record<string, unknown>>
}

export type FixtureByRound = Record<string, Match[]>

export interface Player {
  id: number
  name: string
  email: string
  username?: string | null
  playerName?: string | null
  jerseyNumber?: number | null
  preferredPosition?: string | null
  avatarUrl?: string | null
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
