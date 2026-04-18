/** Roles permitidos al crear/editar usuarios desde admin (alineado con AdminService). */
export type AdminUserRole = "coach" | "player" | "admin" | "referee";

export type LeagueAdminRoleDTO = "principal" | "assistant";

export type CreateUserBodyDTO = {
  name: string;
  email: string;
  password: string;
  role: AdminUserRole;
  confirmed?: boolean;
  reason?: string;
};

export type UpdateUserBodyDTO = {
  name?: string;
  email?: string;
  password?: string;
  role?: AdminUserRole;
  confirmed?: boolean;
  reason?: string;
};

export type CreateFieldBodyDTO = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  capacity?: number;
  isActive?: boolean;
  notes?: string;
  leagueId?: number | null;
  teamId?: number | null;
  reason?: string;
};

export type UpdateFieldBodyDTO = Partial<CreateFieldBodyDTO>;

export type SeasonStatusDTO = "draft" | "active" | "finished" | "archived";

export type CreateSeasonBodyDTO = {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status?: SeasonStatusDTO;
  isCurrent?: boolean;
  reason?: string;
};

export type UpdateSeasonBodyDTO = Partial<CreateSeasonBodyDTO>;

export type ChangeSeasonStatusBodyDTO = {
  status: SeasonStatusDTO;
  reason?: string;
};

export type AuditReasonBodyDTO = {
  reason?: string;
};
