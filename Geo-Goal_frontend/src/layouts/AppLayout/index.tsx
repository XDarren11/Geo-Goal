import { Link, Navigate, Outlet } from "react-router-dom";
import Logo from "@/components/Logo";
import NavMenu from "@/components/NavMenu";
import NotificationBell from "@/components/NotificationBell";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export default function AppLayout() {
  const { data, isError, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

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
  if (isError) return <Navigate to="/public" replace />;

  if (data)
    return (
      <div className="min-h-screen w-full flex flex-col">
        <header className="sticky top-0 z-30 border-b-4 border-geo-green bg-white/95 py-3 px-4 lg:px-20 pitch-stripes-strong shadow-lg shadow-black/5 backdrop-blur-sm dark:bg-geo-black/95 dark:shadow-none">
          <div className="w-full flex flex-col lg:flex-row justify-between items-center gap-4">
            <Link
              className="flex items-center gap-3 transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
              to="/dashboard"
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
                onClick={() => setDesktopMenuOpen((v) => !v)}
                className="hidden rounded-full border-2 border-geo-green p-2 text-geo-black transition-all duration-200 hover:scale-105 hover:bg-geo-green hover:text-white dark:text-geo-green dark:hover:text-geo-black lg:inline-flex"
                aria-label={desktopMenuOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
              >
                {desktopMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-full border-2 border-geo-green p-2 text-geo-black transition-all duration-200 hover:scale-105 hover:bg-geo-green hover:text-white dark:text-geo-green dark:hover:text-geo-black lg:hidden"
                aria-label="Abrir menú lateral"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <NotificationBell />
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
            </div>
          </div>
        </header>

        <section className="flex-1 bg-[var(--geo-bg)] pitch-stripes transition-colors duration-300">
          <div className="w-full h-full py-6 px-4 lg:px-6">
            <div
              className={`mx-auto grid h-full max-w-[1700px] grid-cols-1 gap-6 ${
                desktopMenuOpen ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-1"
              }`}
            >
              <div>
                <Outlet />
              </div>
              {desktopMenuOpen && (
                <div className="hidden lg:block">
                  <NavMenu name={data.name} role={data.role} />
                </div>
              )}
            </div>
          </div>
        </section>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-[86%] max-w-[340px] border-l border-geo-green/30 bg-[var(--geo-bg)] p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-geo text-xl text-[var(--geo-text)]">Menú</p>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full border border-geo-green/40 p-1 text-[var(--geo-text)]"
                  aria-label="Cerrar menú lateral"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <NavMenu name={data.name} role={data.role} onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

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
      </div>
    );

  return null;
}
