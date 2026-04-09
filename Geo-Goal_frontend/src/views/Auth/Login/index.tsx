import { useForm } from "react-hook-form";
import type { UserLoginForm } from "@/types";
import ErrorMessage from "@/components/ErrorMessage";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticateUser, getUser } from "@/api/AuthAPI";
import { toast } from "react-toastify";

export default function LoginView() {
  const defaultValues: UserLoginForm = { email: "", password: "" };
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: UserLoginForm) => {
      await authenticateUser(formData);
      const user = await getUser();
      return user;
    },
    onError: (error) => toast.error(error.message),
    onSuccess: (user) => {
      queryClient.setQueryData(["user"], user);
      navigate("/dashboard");
    },
  });

  return (
    <>
      <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">
        Iniciar sesión
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--geo-text-muted)]">
        Lleva el fútbol a otro nivel{" "}
        <span className="font-geo text-geo-green tracking-wide">iniciando sesión</span>
      </p>

      <form
        onSubmit={handleSubmit((data) => mutate(data))}
        className="mt-10 space-y-6"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold tracking-wide text-[var(--geo-text)]">
            Email
          </label>
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
          <label htmlFor="password" className="text-sm font-semibold tracking-wide text-[var(--geo-text)]">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="input-pitch w-full"
            {...register("password", { required: "La contraseña es obligatoria" })}
          />
          {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn-pitch w-full py-3.5 text-lg disabled:opacity-60"
        >
          {isPending ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>

      <nav className="mt-8 flex flex-col gap-3 text-center">
        <Link
          to="/auth/register"
          className="text-[var(--geo-text-muted)] font-medium transition-colors duration-200 hover:text-geo-green"
        >
          ¿No tienes cuenta? Crear una
        </Link>
        <Link
          to="/auth/forgot-password"
          className="text-[var(--geo-text-muted)] font-medium transition-colors duration-200 hover:text-geo-green"
        >
          ¿Olvidaste tu contraseña? Restablecer
        </Link>
      </nav>
    </>
  );
}
