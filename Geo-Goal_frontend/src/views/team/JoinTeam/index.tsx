import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { KeyIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import ErrorMessage from "@/components/ErrorMessage";

type Form = { code: string; name: string; number: string };

export default function JoinTeamView() {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: { code: "", name: "", number: "" },
  });

  function onSubmit(data: Form) {
    toast.info(
      "La unión por código estará disponible cuando el backend lo soporte. Código: " +
        data.code
    );
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
        Unirse a un equipo
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Ingresa el código que te dio tu entrenador, tu nombre y número en el equipo.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 max-w-md space-y-5 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6"
      >
        <div>
          <label className="flex items-center gap-2 font-semibold text-[var(--geo-text)]">
            <KeyIcon className="h-5 w-5 text-geo-green" />
            Código del equipo
          </label>
          <input
            type="text"
            placeholder="Código que te compartió el entrenador"
            className="mt-2 w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
            {...register("code", { required: "El código es obligatorio" })}
          />
          {errors.code && <ErrorMessage>{errors.code.message}</ErrorMessage>}
        </div>
        <div>
          <label className="block font-semibold text-[var(--geo-text)]">
            Tu nombre (como aparece en el equipo)
          </label>
          <input
            type="text"
            placeholder="Ej: Juan Pérez"
            className="mt-2 w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
            {...register("name", { required: "El nombre es obligatorio" })}
          />
          {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
        </div>
        <div>
          <label className="block font-semibold text-[var(--geo-text)]">
            Número en el equipo
          </label>
          <input
            type="text"
            placeholder="Ej: 10"
            className="mt-2 w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
            {...register("number", { required: "El número es obligatorio" })}
          />
          {errors.number && <ErrorMessage>{errors.number.message}</ErrorMessage>}
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-geo-green py-3 font-bold text-geo-black hover:bg-geo-green-hover"
        >
          Unirme al equipo
        </button>
      </form>
    </div>
  );
}
