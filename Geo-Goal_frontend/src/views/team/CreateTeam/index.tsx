import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { createTeam } from "@/api/teamAPI";
import { toast } from "react-toastify";
import ErrorMessage from "@/components/ErrorMessage";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

type Form = {
  name: string;
  fieldAddress: string;
  lat: string;
  lng: string;
};

export default function CreateTeamView() {
  const navigate = useNavigate();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: {
      name: "",
      fieldAddress: "",
      lat: "",
      lng: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createTeam,
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo crear el equipo")),
    onSuccess: () => {
      toast.success("Equipo creado");
      navigate("/teams");
    },
  });

  function onSubmit(data: Form) {
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Latitud y longitud deben ser números");
      return;
    }
    mutate({
      name: data.name,
      fieldAddress: data.fieldAddress,
      lat,
      lng,
      logo: logoFile || undefined,
    });
  }

  return (
    <div>
      <Link
        to="/teams"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Volver a equipos
      </Link>
      <h1 className="mt-4 text-3xl font-black text-[var(--geo-text)]">
        Crear equipo
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Nombre, dirección del campo y opcionalmente logo.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 max-w-xl space-y-5 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6"
      >
        <div>
          <label className="block text-sm font-semibold text-[var(--geo-text)]">
            Nombre del equipo
          </label>
          <input
            type="text"
            placeholder="Ej: Halcones FC"
            className="mt-1 w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
            {...register("name", { required: "El nombre es obligatorio" })}
          />
          {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--geo-text)]">
            Dirección del campo
          </label>
          <input
            type="text"
            placeholder="Ej: Av. Principal 123"
            className="mt-1 w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
            {...register("fieldAddress", { required: "La dirección es obligatoria" })}
          />
          {errors.fieldAddress && (
            <ErrorMessage>{errors.fieldAddress.message}</ErrorMessage>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-[var(--geo-text)]">
              Latitud
            </label>
            <input
              type="text"
              placeholder="Ej: -12.046374"
              className="mt-1 w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
              {...register("lat", { required: "Latitud es obligatoria" })}
            />
            {errors.lat && <ErrorMessage>{errors.lat.message}</ErrorMessage>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--geo-text)]">
              Longitud
            </label>
            <input
              type="text"
              placeholder="Ej: -77.042793"
              className="mt-1 w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
              {...register("lng", { required: "Longitud es obligatoria" })}
            />
            {errors.lng && <ErrorMessage>{errors.lng.message}</ErrorMessage>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--geo-text)]">
            Logo (opcional)
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
          className="w-full rounded-lg bg-geo-green py-3 font-bold text-geo-black hover:bg-geo-green-hover disabled:opacity-60"
        >
          {isPending ? "Creando…" : "Crear equipo"}
        </button>
      </form>
    </div>
  );
}
