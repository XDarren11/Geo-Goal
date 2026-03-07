export default function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="my-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
    >
      {children}
    </div>
  );
}
