import api from '@/lib/axios';

/**
 * API para invitaciones de liga
 */
export const leagueInvitationAPI = {
  /**
   * Generar nuevo código de invitación
   */
  generateCode: async (leagueId: number, expiresIn?: number) => {
    const { data } = await api.post(`/league/${leagueId}/invitation`, {
      expiresIn,
    });
    return data;
  },

  /**
   * Obtener código actual
   */
  getCode: async (leagueId: number) => {
    const { data } = await api.get(`/league/${leagueId}/invitation`);
    return data;
  },

  /**
   * Unir equipo a liga con código
   */
  joinByCode: async (code: string, teamId?: number) => {
    const { data } = await api.post('/league/join-by-code', {
      code,
      ...(teamId != null ? { teamId } : {}),
    });
    return data;
  },

  /**
   * Revocar código
   */
  revokeCode: async (leagueId: number) => {
    const { data } = await api.delete(`/league/${leagueId}/invitation`);
    return data;
  },
};

/**
 * API para invitaciones de equipo
 */
export const teamInvitationAPI = {
  /**
   * Generar nuevo código de invitación
   */
  generateCode: async (teamId: number, expiresIn?: number) => {
    const { data } = await api.post(`/teams/${teamId}/invitation`, {
      expiresIn,
    });
    return data;
  },

  /**
   * Obtener código actual
   */
  getCode: async (teamId: number) => {
    const { data } = await api.get(`/teams/${teamId}/invitation`);
    return data;
  },

  /**
   * Unir jugador a equipo con código
   */
  joinByCode: async (code: string) => {
    const { data } = await api.post('/teams/join-by-code', { code });
    return data;
  },

  /**
   * Revocar código
   */
  revokeCode: async (teamId: number) => {
    const { data } = await api.delete(`/teams/${teamId}/invitation`);
    return data;
  },
};
