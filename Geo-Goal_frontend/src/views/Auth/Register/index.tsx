import { useForm } from "react-hook-form";
import type { UserRegistrationForm } from "@/types";
import ErrorMessage from "@/components/ErrorMessage";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { createAccount } from "@/api/AuthAPI";
import { toast } from "react-toastify";

export default function RegisterView() {
  const defaultValues: UserRegistrationForm = {
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "",
  };
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<UserRegistrationForm>({ defaultValues });
  const password = watch("password");

  const { mutate, isPending } = useMutation({
    mutationFn: createAccount,
    onError: (error) => toast.error(error.message),
    onSuccess: (data) => {
      toast.success(typeof data === "string" ? data : "Revisa tu email para confirmar la cuenta");
      reset();
    },
  });

  return (
    <>
      <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">
        Crear cuenta
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--geo-text-muted)]">
        Llena el formulario para{" "}
        <span className="font-geo text-geo-green tracking-wide">crear tu cuenta</span>
      </p>

      <form
        onSubmit={handleSubmit((data) => mutate(data))}
        className="mt-10 space-y-5"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-semibold tracking-wide text-[var(--geo-text)]">Nombre</label>
          <input
            id="name"
            type="text"
            placeholder="Tu nombre"
            className="input-pitch w-full"
            {...register("name", { required: "El nombre es obligatorio" })}
          />
          {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-[var(--geo-text)]">Email</label>
          <input
            id="email"
            type="email"
            placeholder="tu@email.com"
            className="input-pitch w-full"
            {...register("email", {
              required: "El email es obligatorio",
              pattern: { value: /\S+@\S+\.\S+/, message: "Email no válido" },
            })}
          />
          {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold text-[var(--geo-text)]">Contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            className="input-pitch w-full"
            {...register("password", {
              required: "La contraseña es obligatoria",
              minLength: { value: 8, message: "Mínimo 8 caracteres" },
            })}
          />
          {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password_confirmation" className="text-sm font-semibold text-[var(--geo-text)]">Repetir contraseña</label>
          <input
            id="password_confirmation"
            type="password"
            placeholder="Repite la contraseña"
            className="input-pitch w-full"
            {...register("password_confirmation", {
              required: "Repite la contraseña",
              validate: (v) => v === password || "Las contraseñas no coinciden",
            })}
          />
          {errors.password_confirmation && <ErrorMessage>{errors.password_confirmation.message}</ErrorMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="role" className="text-sm font-semibold text-[var(--geo-text)]">¿Qué deseas hacer?</label>
          <select
            id="role"
            className="input-pitch w-full"
            {...register("role", { required: "Elige un rol" })}
          >
            <option value="">Selecciona</option>
            <option value="player">Soy jugador</option>
            <option value="coach">Soy entrenador</option>
            <option value="admin">Organizador</option>
          </select>
          {errors.role && <ErrorMessage>{errors.role.message}</ErrorMessage>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn-pitch w-full py-3.5 text-lg disabled:opacity-60"
        >
          {isPending ? "Enviando…" : "Registrarme"}
        </button>
      </form>

      <nav className="mt-8 flex flex-col gap-3 text-center">
        <Link to="/auth/login" className="text-[var(--geo-text-muted)] font-medium transition-colors duration-200 hover:text-geo-green">
          ¿Ya tienes cuenta? Iniciar sesión
        </Link>
        <Link to="/auth/forgot-password" className="text-[var(--geo-text-muted)] font-medium transition-colors duration-200 hover:text-geo-green">
          ¿Olvidaste tu contraseña?
        </Link>
      </nav>
    </>
  );
}
