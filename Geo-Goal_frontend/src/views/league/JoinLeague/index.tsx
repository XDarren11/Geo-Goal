import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { KeyIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import ErrorMessage from "@/components/ErrorMessage";

type Form = { token: string };

export default function JoinLeagueView() {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: { token: "" },
  });

  function onSubmit(_data: Form) {
    toast.info("La unión por token estará disponible cuando el backend lo soporte.");
  }

  return (
    <div>
      <Link
        to="/"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-black text-[var(--geo-text)]">
        Unirse a una liga
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Ingresa el token que te compartió el organizador de la liga para unir tus equipos.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 max-w-md rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6"
      >
        <div className="flex items-center gap-2 text-geo-green">
          <KeyIcon className="h-6 w-6" />
          <label className="font-semibold text-[var(--geo-text)]">Token de la liga</label>
        </div>
        <input
          type="text"
          placeholder="Pega aquí el token"
          className="mt-2 w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
          {...register("token", { required: "El token es obligatorio" })}
        />
        {errors.token && <ErrorMessage>{errors.token.message}</ErrorMessage>}
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-geo-green py-3 font-bold text-geo-black hover:bg-geo-green-hover"
        >
          Unirme a la liga
        </button>
      </form>
    </div>
  );
}
