import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { createLeague } from "@/api/leagueAPI";
import { toast } from "react-toastify";
import ErrorMessage from "@/components/ErrorMessage";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

type Form = { name: string; description: string; lineupMode: 7 | 11 };

export default function CreateLeagueView() {
  const navigate = useNavigate();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: { name: "", description: "", lineupMode: 11 },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createLeague,
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo crear la liga")),
    onSuccess: (msg) => {
      toast.success(typeof msg === "string" ? msg : "Liga creada");
      navigate("/leagues");
    },
  });

  return (
    <div className="opacity-0 animate-in-up">
      <Link
        to="/leagues"
        className="text-sm font-medium text-[var(--geo-text-muted)] transition-colors duration-200 hover:text-geo-green"
      >
        ← Volver a ligas
      </Link>
      <h1 className="mt-5 font-geo text-4xl tracking-wide text-[var(--geo-text)]">
        Crear liga
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Nombre, descripción y logo de la liga.
      </p>

      <form
        onSubmit={handleSubmit((data) => mutate({ ...data, logo: logoFile ?? undefined }))}
        className="card-pitch mt-8 max-w-xl space-y-5 p-6"
      >
        <div>
          <label className="block text-sm font-semibold tracking-wide text-[var(--geo-text)]">
            Nombre de la liga
          </label>
          <input
            type="text"
            placeholder="Ej: Liga Municipal 2025"
            className="input-pitch mt-1.5 w-full"
            {...register("name", { required: "El nombre es obligatorio" })}
          />
          {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
        </div>
        <div>
          <label className="block text-sm font-semibold tracking-wide text-[var(--geo-text)]">
            Descripción
          </label>
          <textarea
            rows={3}
            placeholder="Descripción de la liga"
            className="input-pitch mt-1.5 w-full resize-none"
            {...register("description", { required: "La descripción es obligatoria" })}
          />
          {errors.description && (
            <ErrorMessage>{errors.description.message}</ErrorMessage>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold tracking-wide text-[var(--geo-text)]">
            Formato de la liga
          </label>
          <select
            className="input-pitch mt-1.5 w-full"
            {...register("lineupMode", { required: "Selecciona el formato", valueAsNumber: true })}
          >
            <option value={11}>11 vs 11</option>
            <option value={7}>7 vs 7</option>
          </select>
          {errors.lineupMode && <ErrorMessage>{errors.lineupMode.message}</ErrorMessage>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--geo-text)]">
            Logo de la liga (opcional)
          </label>
          <input
            type="file"
            accept="image/*"
            className="mt-1 text-sm text-[var(--geo-text-muted)]"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          />
          {logoFile ? (
            <p className="mt-2 text-xs text-[var(--geo-text-muted)]">
              Archivo seleccionado: {logoFile.name}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-pitch w-full py-3 disabled:opacity-60"
        >
          {isPending ? "Creando…" : "Crear liga"}
        </button>
      </form>
    </div>
  );
}
