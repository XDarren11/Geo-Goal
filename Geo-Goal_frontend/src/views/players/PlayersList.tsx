/**
 * PlayersList — Directorio público de jugadores
 *
 * Lista todos los jugadores de la plataforma con su rating promedio,
 * goles, asistencias y partidos. Permite buscar por nombre, filtrar por
 * liga y rating mínimo, y ordenar por distintos criterios.
 *
 * Cada jugador es un enlace a su dashboard agregado (/players/:id/dashboard).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getPublicPlayersList,
  getPublicLeagues,
  type PublicPlayersListFilters,
  type PublicPlayerListItem,
} from "@/api/publicAPI";
import {
  MagnifyingGlassIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  StarIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

function ratingColor(r: number): string {
  if (r >= 8) return "text-emerald-300";
  if (r >= 7) return "text-emerald-400";
  if (r >= 6) return "text-amber-400";
  if (r >= 4) return "text-orange-400";
  if (r > 0) return "text-red-400";
  return "text-zinc-500";
}

function PlayerCard({ player }: { player: PublicPlayerListItem }) {
  return (
    <Link
      to={`/players/${player.playerId}/dashboard`}
      className="flex items-center gap-4 rounded-2xl border border-geo-green/20 bg-[var(--geo-bg-card)] p-4 transition-all hover:scale-[1.01] hover:border-geo-green/50 hover:shadow-lg"
    >
      {/* Avatar inicial */}
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-geo-green/40 bg-geo-green/10 text-xl font-geo font-bold text-geo-green">
        {(player.name?.[0] || "?").toUpperCase()}
      </div>

      {/* Info principal */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-geo text-lg text-[var(--geo-text)]">
          {player.name}
        </p>
        {player.username && (
          <p className="truncate text-xs text-[var(--geo-text-muted)]">
            @{player.username}
          </p>
        )}
        {player.team && (
          <p className="mt-1 truncate text-xs text-[var(--geo-text-muted)]">
            <span className="text-geo-green">⚽</span> {player.team.name}
          </p>
        )}
      </div>

      {/* Stats compactos */}
      <div className="hidden flex-shrink-0 items-center gap-4 text-center sm:flex">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--geo-text-muted)]">Rating</p>
          <p className={`text-lg font-bold ${ratingColor(player.avgRating)}`}>
            {player.avgRating > 0 ? player.avgRating.toFixed(1) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--geo-text-muted)]">G</p>
          <p className="text-lg font-bold text-[var(--geo-text)]">{player.totalGoals}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--geo-text-muted)]">A</p>
          <p className="text-lg font-bold text-[var(--geo-text)]">{player.totalAssists}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--geo-text-muted)]">PJ</p>
          <p className="text-lg font-bold text-[var(--geo-text)]">{player.matchCount}</p>
        </div>
      </div>

      {/* Stats stacked en mobile */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5 sm:hidden">
        <p className={`text-lg font-bold ${ratingColor(player.avgRating)}`}>
          {player.avgRating > 0 ? player.avgRating.toFixed(1) : "—"}
        </p>
        <p className="text-xs text-[var(--geo-text-muted)]">
          {player.totalGoals}G · {player.totalAssists}A
        </p>
      </div>
    </Link>
  );
}

export default function PlayersListView() {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [leagueId, setLeagueId] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<NonNullable<PublicPlayersListFilters["sortBy"]>>("rating");
  const [page, setPage] = useState(1);
  const pageSize = 24;

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters: PublicPlayersListFilters = {
    page,
    pageSize,
    sortBy,
  };
  if (searchDebounced.trim()) filters.search = searchDebounced.trim();
  if (leagueId) filters.league = leagueId;
  if (minRating) filters.minRating = minRating;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["public", "players", filters],
    queryFn: () => getPublicPlayersList(filters),
    placeholderData: keepPreviousData,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ["public", "leagues"],
    queryFn: getPublicLeagues,
    staleTime: 5 * 60_000,
  });

  const players = data?.players ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-geo-green/20 bg-[var(--geo-bg-card)] p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full border-2 border-geo-green bg-geo-green/10 p-2">
            <TrophyIcon className="h-6 w-6 text-geo-green" />
          </div>
          <div>
            <h1 className="font-geo text-2xl tracking-wide text-[var(--geo-text)]">
              Directorio de jugadores
            </h1>
            <p className="text-sm text-[var(--geo-text-muted)]">
              Descubre perfiles, rating promedio y estadísticas.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-geo-green/20 bg-[var(--geo-bg-card)] p-4 md:grid-cols-4">
        {/* Buscador */}
        <div className="relative md:col-span-2">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--geo-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-geo-green/30 bg-[var(--geo-bg)] py-2 pl-10 pr-3 text-sm text-[var(--geo-text)] placeholder:text-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none"
          />
        </div>

        {/* Liga */}
        <select
          value={leagueId ?? ""}
          onChange={(e) => {
            setLeagueId(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="rounded-xl border border-geo-green/30 bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)] focus:border-geo-green focus:outline-none"
        >
          <option value="">Todas las ligas</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {/* Min rating */}
        <select
          value={minRating ?? ""}
          onChange={(e) => {
            setMinRating(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="rounded-xl border border-geo-green/30 bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)] focus:border-geo-green focus:outline-none"
        >
          <option value="">Rating mín. — todos</option>
          <option value="5">Rating ≥ 5</option>
          <option value="6">Rating ≥ 6</option>
          <option value="7">Rating ≥ 7</option>
          <option value="8">Rating ≥ 8</option>
        </select>

        {/* Ordenar por */}
        <div className="flex items-center gap-2 md:col-span-4">
          <span className="text-xs uppercase tracking-wider text-[var(--geo-text-muted)]">
            Ordenar por:
          </span>
          {(
            [
              { key: "rating", label: "Rating", icon: StarIcon },
              { key: "goals", label: "Goles" },
              { key: "assists", label: "Asistencias" },
              { key: "matches", label: "Partidos" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setSortBy(opt.key);
                setPage(1);
              }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                sortBy === opt.key
                  ? "bg-geo-green text-geo-black"
                  : "border border-geo-green/30 text-[var(--geo-text-muted)] hover:bg-geo-green/10"
              }`}
            >
              {opt.label}
              {sortBy === opt.key && <ArrowDownIcon className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {isLoading ? (
        <div className="rounded-2xl border border-geo-green/20 bg-[var(--geo-bg-card)] p-12 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-geo-green border-t-transparent" />
          <p className="mt-4 text-sm text-[var(--geo-text-muted)]">Cargando jugadores…</p>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center text-sm text-red-400">
          No se pudieron cargar los jugadores. Intenta de nuevo más tarde.
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-2xl border border-geo-green/20 bg-[var(--geo-bg-card)] p-12 text-center">
          <p className="font-geo text-lg text-[var(--geo-text)]">Sin resultados</p>
          <p className="mt-2 text-sm text-[var(--geo-text-muted)]">
            Ajusta los filtros para ver más jugadores.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-[var(--geo-text-muted)]">
            <span>
              {total} jugador{total !== 1 ? "es" : ""} · página {page} de {totalPages}
            </span>
            {isFetching && (
              <span className="text-geo-green/80 animate-pulse">Actualizando…</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {players.map((p) => (
              <PlayerCard key={p.playerId} player={p} />
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="flex items-center gap-1 rounded-lg border border-geo-green/30 px-3 py-1.5 text-sm font-semibold text-[var(--geo-text)] hover:bg-geo-green/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUpIcon className="h-4 w-4 rotate-[-90deg]" />
                Anterior
              </button>
              <span className="text-sm text-[var(--geo-text-muted)]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
                className="flex items-center gap-1 rounded-lg border border-geo-green/30 px-3 py-1.5 text-sm font-semibold text-[var(--geo-text)] hover:bg-geo-green/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
                <ArrowDownIcon className="h-4 w-4 rotate-[-90deg]" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
