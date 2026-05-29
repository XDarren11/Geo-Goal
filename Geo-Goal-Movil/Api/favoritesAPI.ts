import api from '@/lib/axios';

const ACCOUNT = '/account';

export type FavoriteEntityType = 'team' | 'player' | 'coach' | 'league' | 'admin';

export interface FavoriteDisplay {
  id: number;
  name: string;
  avatarUrl?: string | null;
  username?: string | null;
}

export interface FavoriteItem {
  id: number;
  entityType: FavoriteEntityType;
  entityId: number;
  label: string | null;
  sortOrder: number;
  createdAt: string;
  display: FavoriteDisplay | null;
}

export interface FavoriteIdRef {
  entityType: FavoriteEntityType;
  entityId: number;
}

export async function getFavorites(type?: FavoriteEntityType): Promise<FavoriteItem[]> {
  const { data } = await api.get<FavoriteItem[]>(`${ACCOUNT}/favorites`, {
    params: type ? { type } : undefined,
  });
  return Array.isArray(data) ? data : [];
}

export async function getFavoriteIds(): Promise<FavoriteIdRef[]> {
  const { data } = await api.get<FavoriteIdRef[]>(`${ACCOUNT}/favorites/ids`);
  return Array.isArray(data) ? data : [];
}

export async function addFavorite(opts: {
  entityType: FavoriteEntityType;
  entityId: number;
  label?: string | null;
  sortOrder?: number;
}): Promise<FavoriteItem> {
  const { data } = await api.post<FavoriteItem>(`${ACCOUNT}/favorites`, opts);
  return data;
}

export async function removeFavoriteById(id: number): Promise<{ removed: number }> {
  const { data } = await api.delete<{ removed: number }>(`${ACCOUNT}/favorites/${id}`);
  return data;
}

export async function removeFavoriteByEntity(opts: {
  entityType: FavoriteEntityType;
  entityId: number;
}): Promise<{ removed: number }> {
  const { data } = await api.delete<{ removed: number }>(`${ACCOUNT}/favorites`, { params: opts });
  return data;
}
