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
    id: z.number()
})

export type User = z.infer<typeof userSchema>
export type Role = 'admin' | 'coach' | 'player' | 'referee'

// League
export interface League {
  id: number
  name: string
  description?: string
  managerId?: number
  teams?: Team[]
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
  leagueId: number
  homeTeamId: number
  awayTeamId: number
  date?: string | null
  roundName: string
  homeScore: number
  awayScore: number
  played: boolean
  homeTeam?: Team
  awayTeam?: Team
}

export type FixtureByRound = Record<string, Match[]>

export interface Player {
  id: number
  name: string
  email: string
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
