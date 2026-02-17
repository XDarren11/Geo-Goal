/**
 * Roles disponibles en el sistema
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    COACH: 'coach',
    PLAYER: 'player'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Lista de roles válidos para validación
 */
export const VALID_ROLES: UserRole[] = Object.values(USER_ROLES);

