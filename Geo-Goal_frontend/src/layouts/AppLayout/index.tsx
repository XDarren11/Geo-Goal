import { Link, Navigate, Outlet } from "react-router-dom";
import Logo from "@/components/Logo";
import NavMenu from "@/components/NavMenu";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function AppLayout() {
  const { data, isError, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--geo-bg)] pitch-stripes">
        <div className="h-12 w-12 rounded-full border-2 border-geo-green border-t-transparent animate-spin" />
        <p className="font-geo text-2xl tracking-wide text-geo-green animate-pulse-soft">
          Cargando…
        </p>
      </div>
    );
  }
  if (isError) return <Navigate to="/auth/login" />;

  if (data)
    return (
      <>
        <header className="sticky top-0 z-30 border-b-4 border-geo-green bg-white/95 py-3 px-4 lg:px-20 pitch-stripes-strong shadow-lg shadow-black/5 backdrop-blur-sm dark:bg-geo-black/95 dark:shadow-none">
          <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
            <Link
              className="flex items-center gap-3 transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
              to="/"
            >
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full border-2 border-geo-green flex items-center justify-center overflow-hidden bg-geo-black dark:bg-geo-black shadow-md">
                <Logo />
              </div>
              <span className="font-geo text-2xl lg:text-3xl tracking-wider text-geo-black dark:text-geo-green">
                Geo-Goal
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border-2 border-geo-green p-2 text-geo-black transition-all duration-200 hover:scale-105 hover:bg-geo-green hover:text-white dark:text-geo-green dark:hover:bg-geo-green dark:hover:text-geo-black"
                aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              >
                {theme === "dark" ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>
              <NavMenu name={data.name} role={data.role} />
            </div>
          </div>
        </header>

        <section className="min-h-[60vh] bg-[var(--geo-bg)] pitch-stripes transition-colors duration-300">
          <div className="max-w-screen-2xl mx-auto py-8 px-4 lg:px-6">
            <Outlet />
          </div>
        </section>

        <footer className="border-t-4 border-geo-green bg-white py-6 dark:bg-geo-black">
          <p className="text-center font-geo text-sm tracking-wide text-geo-black/80 dark:text-geo-green/90">
            Geo-Goal © {new Date().getFullYear()} — Fútbol a otro nivel
          </p>
        </footer>

        <ToastContainer
          pauseOnHover={false}
          pauseOnFocusLoss={false}
          theme={theme}
          toastClassName="!bg-[var(--geo-bg-card)] !text-[var(--geo-text)] !border-2 !border-geo-green/50 !rounded-xl !shadow-lg"
          progressClassName="!bg-geo-green"
        />
      </>
    );

  return null;
}
