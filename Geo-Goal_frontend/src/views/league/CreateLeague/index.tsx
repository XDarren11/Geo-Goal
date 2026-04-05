import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { createLeague } from "@/api/leagueAPI";
import { toast } from "react-toastify";
import ErrorMessage from "@/components/ErrorMessage";
import { Link } from "react-router-dom";

type Form = { name: string; description: string };

export default function CreateLeagueView() {
  const navigate = useNavigate();
  const [_logoFile, setLogoFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: { name: "", description: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createLeague,
    onError: (e) => toast.error(e.message),
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
        Nombre, descripción y logo de la liga (logo próximamente en API).
      </p>

      <form
        onSubmit={handleSubmit((data) => mutate(data))}
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
          <label className="block text-sm font-semibold text-[var(--geo-text)]">
            Logo de la liga (próximamente)
          </label>
          <input
            type="file"
            accept="image/*"
            className="mt-1 text-sm text-[var(--geo-text-muted)]"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          />
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
