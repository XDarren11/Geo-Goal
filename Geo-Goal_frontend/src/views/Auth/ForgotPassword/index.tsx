import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import type { ForgotPasswordForm } from "@/types";
import ErrorMessage from "@/components/ErrorMessage";
import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@/api/AuthAPI";
import { toast } from "react-toastify";

export default function ForgotPasswordView() {
  const defaultValues: ForgotPasswordForm = { email: "" };
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues });

  const { mutate, isPending } = useMutation({
    mutationFn: forgotPassword,
    onError: (error) => toast.error(error.message),
    onSuccess: (data) => {
      toast.success(typeof data === "string" ? data : "Revisa tu email");
      reset();
    },
  });

  return (
    <>
      <h1 className="text-4xl font-black text-[var(--geo-text)]">
        Restablecer contraseña
      </h1>
      <p className="mt-4 text-lg text-[var(--geo-text-muted)]">
        ¿Olvidaste tu contraseña? Escribe tu email{" "}
        <span className="font-bold text-geo-green">y te enviamos instrucciones</span>
      </p>

      <form
        onSubmit={handleSubmit((data) => mutate(data))}
        className="mt-8 space-y-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-lg dark:shadow-none"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-[var(--geo-text)]">Email</label>
          <input
            id="email"
            type="email"
            placeholder="tu@email.com"
            className="w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
            {...register("email", {
              required: "El email es obligatorio",
              pattern: { value: /\S+@\S+\.\S+/, message: "Email no válido" },
            })}
          />
          {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-geo-green py-3 font-bold text-geo-black transition-colors hover:bg-geo-green-hover disabled:opacity-60"
        >
          {isPending ? "Enviando…" : "Enviar instrucciones"}
        </button>
      </form>

      <nav className="mt-6 flex flex-col gap-3 text-center">
        <Link to="/auth/login" className="text-[var(--geo-text-muted)] hover:text-geo-green transition-colors">
          ¿Ya tienes cuenta? Iniciar sesión
        </Link>
        <Link to="/auth/register" className="text-[var(--geo-text-muted)] hover:text-geo-green transition-colors">
          ¿No tienes cuenta? Crear una
        </Link>
      </nav>
    </>
  );
}
