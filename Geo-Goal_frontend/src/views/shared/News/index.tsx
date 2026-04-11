import { Link } from "react-router-dom";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { getPublicNews } from "@/api/publicAPI";

export default function NewsView() {
  const { data: news, isLoading } = useQuery({
    queryKey: ["public-news", "private-view"],
    queryFn: () => getPublicNews(25),
  });

  return (
    <div>
      <Link
        to="/dashboard"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-black text-[var(--geo-text)]">
        Noticias
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Novedades de ligas, temporadas y partidos.
      </p>

      {isLoading ? (
        <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center">
          <p className="text-[var(--geo-text-muted)]">Cargando noticias…</p>
        </div>
      ) : news?.length ? (
        <ul className="mt-8 space-y-3">
          {news.map((item) => (
            <li key={item.id} className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
              <p className="text-xs text-[var(--geo-text-muted)]">{new Date(item.createdAt).toLocaleString()} · {item.leagueName || "Geo-Goal"}</p>
              <p className="mt-1 font-bold text-[var(--geo-text)]">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--geo-text-muted)]">{item.summary}</p>
              {item.matchId ? (
                <Link to={`/public/matches/${item.matchId}/detail`} className="mt-2 inline-block text-xs font-semibold text-geo-green hover:underline">
                  Ver partido
                </Link>
              ) : item.leagueId ? (
                <Link to={`/public/leagues/${item.leagueId}`} className="mt-2 inline-block text-xs font-semibold text-geo-green hover:underline">
                  Ver liga
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-geo-green" />
          <p className="mt-4 text-[var(--geo-text-muted)]">No hay noticias disponibles todavía.</p>
        </div>
      )}
    </div>
  );
}
