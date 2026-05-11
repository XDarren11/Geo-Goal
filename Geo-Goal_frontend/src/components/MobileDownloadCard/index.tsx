import { ArrowDownIcon } from "@heroicons/react/24/solid";

type Props = {
  apkUrl?: string;
};

const SUPABASE_PUBLIC_BASE_URL = import.meta.env.VITE_SUPABASE_PUBLIC_BASE_URL as string | undefined;
const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET as string | undefined;

function buildSupabasePublicUrl(path: string): string {
  if (!SUPABASE_PUBLIC_BASE_URL || !SUPABASE_BUCKET) return "";
  const normalizedBase = SUPABASE_PUBLIC_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.replace(/^\//, "");
  return `${normalizedBase}/${SUPABASE_BUCKET}/${normalizedPath}`;
}

export default function MobileDownloadCard({ apkUrl }: Props) {
  const resolvedApkUrl = apkUrl && apkUrl !== "#" ? apkUrl : buildSupabasePublicUrl("releases-apk/latest.apk");
  return (
    <div className="relative overflow-hidden rounded-3xl border border-geo-green/30 bg-gradient-to-br from-geo-green/10 via-transparent to-transparent p-6 shadow-sm backdrop-blur-sm transition hover:border-geo-green/60">
      {/* Subtle accent line */}
      <div className="absolute inset-0 bg-gradient-to-r from-geo-green/20 via-transparent to-transparent opacity-40" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-geo-green">Descarga la app</p>
            <h3 className="mt-1 font-geo text-lg tracking-wide text-[var(--geo-text)]">Geo-Goal Mobile</h3>
          </div>
          {/* Mobile icon */}
          <div className="rounded-full bg-geo-green/20 p-2.5">
            <svg className="h-5 w-5 text-geo-green" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 2H7c-1.1 0-1.99.9-1.99 2v16c0 1.1.89 2 1.99 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5-3H7V4h10v13z" />
            </svg>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--geo-text-muted)]">
          Gestiona tu equipo, mira partidos en vivo y estadísticas en tiempo real desde tu teléfono.
        </p>

        {/* Download button */}
        <button
          onClick={() => {
            if (resolvedApkUrl) {
              const link = document.createElement("a");
              link.href = resolvedApkUrl;
              link.download = "Geo-Goal.apk";
              link.click();
            }
          }}
          className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-geo-green px-4 py-3 text-sm font-semibold text-geo-black shadow-md transition hover:shadow-lg hover:scale-[1.02]"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <span>Descargar APK</span>
          <ArrowDownIcon className="h-4 w-4 opacity-70 group-hover:opacity-100" />
        </button>

        {/* Badge */}
        <p className="text-xs text-[var(--geo-text-muted)]">
          ✓ Android 8.0+ · Sin anuncios · Sincronización automática
        </p>
      </div>
    </div>
  );
}
