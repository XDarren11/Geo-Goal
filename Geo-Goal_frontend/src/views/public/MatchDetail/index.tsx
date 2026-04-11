import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicMatchDetail } from "@/api/publicAPI";
import type { MatchDetailLineupEntry, MatchSquadPlayerView } from "@/types";
import { ArrowLeftIcon, ClockIcon, CalendarDaysIcon, MapPinIcon, UserGroupIcon } from "@heroicons/react/24/outline";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function listLabel(player: MatchDetailLineupEntry, index: number) {
  const name = typeof player.name === "string" && player.name.trim().length > 0
    ? player.name
    : `Jugador ${index + 1}`;
  const number = typeof player.number === "number" ? `#${player.number}` : "";
  const position = typeof player.position === "string" && player.position.trim().length > 0
    ? `(${player.position})`
    : "";
  return [number, name, position].filter(Boolean).join(" ").trim();
}

function listLabelStructured(player: MatchSquadPlayerView, index: number) {
  const name = typeof player.name === "string" && player.name.trim().length > 0
    ? player.name
    : `Jugador ${index + 1}`;
  const number = typeof player.jerseyNumber === "number" ? `#${player.jerseyNumber}` : "";
  const position = typeof player.position === "string" && player.position.trim().length > 0
    ? `(${player.position})`
    : "";
  return [number, name, position].filter(Boolean).join(" ").trim();
}

function TeamLineupCard({
  title,
  starters,
  bench,
  roster,
  unavailable,
}: {
  title: string;
  starters?: MatchDetailLineupEntry[];
  bench?: MatchDetailLineupEntry[];
  roster?: MatchSquadPlayerView[];
  unavailable?: MatchSquadPlayerView[];
}) {
  const safeStarters = Array.isArray(starters) ? starters : [];
  const safeBench = Array.isArray(bench) ? bench : [];

  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
      <h3 className="font-black text-[var(--geo-text)]">{title}</h3>

      <div className="mt-4">
        <p className="text-sm font-bold text-geo-green">11 en cancha</p>
        {safeStarters.length ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {safeStarters.map((p, idx) => (
              <li key={`s-${idx}`} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]">
                {listLabel(p, idx)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--geo-text-muted)]">Sin titulares registrados.</p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-bold text-geo-green">Banca</p>
        {safeBench.length ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {safeBench.map((p, idx) => (
              <li key={`b-${idx}`} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]">
                {listLabel(p, idx)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--geo-text-muted)]">Sin banca registrada.</p>
        )}
      </div>

      {Array.isArray(roster) && roster.length ? (
        <div className="mt-4">
          <p className="text-sm font-bold text-geo-green">Plantilla disponible</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {roster.map((p, idx) => (
              <li key={`r-${idx}`} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]">
                {listLabelStructured(p, idx)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {Array.isArray(unavailable) && unavailable.length ? (
        <div className="mt-4">
          <p className="text-sm font-bold text-red-400">No disponibles</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {unavailable.map((p, idx) => (
              <li key={`u-${idx}`} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]">
                {listLabelStructured(p, idx)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function PublicMatchDetailView() {
  const { matchId } = useParams<{ matchId: string }>();
  const id = Number(matchId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-match-detail", id],
    queryFn: () => getPublicMatchDetail(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes flex items-center justify-center">
        <p className="text-[var(--geo-text-muted)]">Cargando detalle del partido…</p>
      </div>
    );
  }

  if (isError || !data?.match) {
    return (
      <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-500">
          No se pudo cargar el detalle del partido.
          <div className="mt-4">
            <Link to="/results" className="text-geo-green hover:underline">
              Volver a resultados
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { match, detail } = data;
  const homeStarters = detail.squads?.home?.starters?.length
    ? detail.squads.home.starters.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail.homeStartingXI;

  const homeBench = detail.squads?.home?.bench?.length
    ? detail.squads.home.bench.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail.homeBench;

  const awayStarters = detail.squads?.away?.starters?.length
    ? detail.squads.away.starters.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail.awayStartingXI;

  const awayBench = detail.squads?.away?.bench?.length
    ? detail.squads.away.bench.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail.awayBench;

  return (
    <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes text-[var(--geo-text)]">
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <Link to="/results" className="inline-flex items-center gap-2 text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a resultados
        </Link>

        <section className="mt-4 rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
          <h1 className="font-geo text-3xl lg:text-4xl">Detalle de partido</h1>
          <p className="mt-2 text-lg text-[var(--geo-text)]">
            {match.homeTeam?.name ?? "Local"} vs {match.awayTeam?.name ?? "Visitante"}
          </p>
          <p className="mt-1 text-sm text-[var(--geo-text-muted)]">{match.roundName}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-[var(--geo-bg)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Marcador</p>
              <p className="mt-1 text-2xl font-black text-geo-green">
                {match.played ? `${match.homeScore} - ${match.awayScore}` : "Pendiente"}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--geo-bg)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Entrenador local</p>
              <p className="mt-1 font-semibold">{detail.homeCoach?.name || "—"}</p>
            </div>
            <div className="rounded-xl bg-[var(--geo-bg)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Entrenador visitante</p>
              <p className="mt-1 font-semibold">{detail.awayCoach?.name || "—"}</p>
            </div>
            <div className="rounded-xl bg-[var(--geo-bg)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Asistencia</p>
              <p className="mt-1 font-semibold">{detail.attendance ?? "—"}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 font-black text-[var(--geo-text)]">
              <ClockIcon className="h-5 w-5 text-geo-green" />
              Tiempo y programación
            </h2>
            <ul className="space-y-2 text-sm">
              <li><span className="text-[var(--geo-text-muted)]">Hora de inicio:</span> {formatDateTime(detail.kickoffTime ?? match.date)}</li>
              <li><span className="text-[var(--geo-text-muted)]">Duración:</span> {detail.durationMinutes ?? 90} min</li>
              <li><span className="text-[var(--geo-text-muted)]">Hora de término:</span> {formatDateTime(detail.endTime)}</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 font-black text-[var(--geo-text)]">
              <CalendarDaysIcon className="h-5 w-5 text-geo-green" />
              Día y campo
            </h2>
            <ul className="space-y-2 text-sm">
              <li><span className="text-[var(--geo-text-muted)]">Día:</span> {formatDateOnly(detail.matchDay)}</li>
              <li>
                <span className="text-[var(--geo-text-muted)]">Campo:</span> {detail.field?.name || "—"}
              </li>
              <li>
                <span className="text-[var(--geo-text-muted)]">Ubicación:</span>{" "}
                {detail.field?.address || match.homeTeam?.fieldAddress || "—"}
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <TeamLineupCard
            title={`Alineación ${match.homeTeam?.name ?? "Local"}`}
            starters={homeStarters}
            bench={homeBench}
            roster={detail.squads?.home?.roster}
            unavailable={detail.squads?.home?.unavailable}
          />
          <TeamLineupCard
            title={`Alineación ${match.awayTeam?.name ?? "Visitante"}`}
            starters={awayStarters}
            bench={awayBench}
            roster={detail.squads?.away?.roster}
            unavailable={detail.squads?.away?.unavailable}
          />
        </section>

        <section className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
          <h2 className="mb-3 flex items-center gap-2 font-black text-[var(--geo-text)]">
            <UserGroupIcon className="h-5 w-5 text-geo-green" />
            Información adicional
          </h2>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-lg bg-[var(--geo-bg)] px-3 py-2"><span className="text-[var(--geo-text-muted)]">Árbitro:</span> {detail.referee || "—"}</div>
            <div className="rounded-lg bg-[var(--geo-bg)] px-3 py-2"><span className="text-[var(--geo-text-muted)]">Clima:</span> {detail.weather || "—"}</div>
            <div className="rounded-lg bg-[var(--geo-bg)] px-3 py-2"><span className="text-[var(--geo-text-muted)]">Cancha:</span> {detail.field?.name || "—"}</div>
          </div>
          {detail.notes ? (
            <p className="mt-4 rounded-lg bg-[var(--geo-bg)] p-3 text-sm text-[var(--geo-text)]">
              <span className="font-semibold text-[var(--geo-text-muted)]">Notas: </span>
              {detail.notes}
            </p>
          ) : null}

          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--geo-text-muted)]">
            <MapPinIcon className="h-4 w-4" />
            Visible para todos. Edición exclusiva para administradores.
          </div>
        </section>
      </main>
    </div>
  );
}
