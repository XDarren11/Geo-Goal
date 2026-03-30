import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function AuthLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes transition-colors duration-300">
      <div
        className="pointer-events-none fixed inset-0 opacity-30 dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(57, 255, 20, 0.25), transparent)',
        }}
      />

      <div className="absolute top-6 right-6 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border-2 border-geo-green bg-[var(--geo-bg-card)] p-2.5 text-geo-green shadow-lg transition-all duration-300 hover:scale-105 hover:bg-geo-green hover:text-geo-black hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] dark:border-geo-green dark:bg-geo-black dark:text-geo-green dark:hover:bg-geo-green dark:hover:text-geo-black"
          aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? (
            <SunIcon className="h-6 w-6" />
          ) : (
            <MoonIcon className="h-6 w-6" />
          )}
        </button>
      </div>

      <div className="relative py-12 lg:py-20 mx-auto max-w-md px-4">
        <div className="card-pitch p-6 sm:p-8 opacity-0 animate-in-scale">
          <Outlet />
        </div>
      </div>

      <ToastContainer
        pauseOnHover={false}
        pauseOnFocusLoss={false}
        theme={theme}
        toastClassName="!bg-[var(--geo-bg-card)] !text-[var(--geo-text)] !border-2 !border-geo-green/50 !rounded-xl !shadow-lg"
        progressClassName="!bg-geo-green"
      />
    </div>
  );
}
