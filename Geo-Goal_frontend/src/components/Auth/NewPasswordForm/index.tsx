import type { ConfirmToken, NewPasswordForm as NewPasswordFormType } from "@/types";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import ErrorMessage from "@/components/ErrorMessage";
import { useMutation } from "@tanstack/react-query";
import { updatePasswordWithToken } from "@/api/AuthAPI";
import { toast } from "react-toastify";

type NewPasswordFormProps = {
  token: ConfirmToken["token"];
};

export default function NewPasswordForm({ token }: NewPasswordFormProps) {
  const navigate = useNavigate();
  const defaultValues: NewPasswordFormType = {
    password: "",
    password_confirmation: "",
  };
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ defaultValues });
  const password = watch("password");

  const { mutate, isPending } = useMutation({
    mutationFn: updatePasswordWithToken,
    onError: (error) => toast.error(error.message),
    onSuccess: (data) => {
      toast.success(typeof data === "string" ? data : "Contraseña actualizada");
      reset();
      navigate("/auth/login");
    },
  });

  const handleNewPassword = (formData: NewPasswordFormType) => {
    mutate({ formData, token });
  };

  return (
    <form
      onSubmit={handleSubmit(handleNewPassword)}
      className="mt-8 space-y-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-lg dark:shadow-none"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold text-[var(--geo-text)]">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          className="w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
          {...register("password", {
            required: "La contraseña es obligatoria",
            minLength: { value: 8, message: "Mínimo 8 caracteres" },
          })}
        />
        {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password_confirmation" className="text-sm font-semibold text-[var(--geo-text)]">
          Repetir contraseña
        </label>
        <input
          id="password_confirmation"
          type="password"
          placeholder="Repite la contraseña"
          className="w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] placeholder-[var(--geo-text-muted)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
          {...register("password_confirmation", {
            required: "Repite la contraseña",
            validate: (v) => v === password || "Las contraseñas no coinciden",
          })}
        />
        {errors.password_confirmation && (
          <ErrorMessage>{errors.password_confirmation.message}</ErrorMessage>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-geo-green py-3 font-bold text-geo-black transition-colors hover:bg-geo-green-hover disabled:opacity-60"
      >
        {isPending ? "Guardando…" : "Establecer contraseña"}
      </button>
    </form>
  );
}
