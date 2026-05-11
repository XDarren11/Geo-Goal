import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  resendAccountConfirmationEmail,
  updateAccountPassword,
  updateAccountUsername,
  requestConfirmationCode,
} from "@/api/AuthAPI";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

export default function AccountManagementView() {
  const { data: user } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");

  useEffect(() => {
    setUsername(user?.username ? `@${user.username}` : "");
  }, [user?.username]);

  const normalizedUsername = useMemo(() => username.trim().replace(/^@+/, ""), [username]);

  const usernameMutation = useMutation({
    mutationFn: () => updateAccountUsername(normalizedUsername),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Nombre de usuario actualizado");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "No se pudo actualizar el nombre de usuario")),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      updateAccountPassword({
        currentPassword,
        newPassword,
        newPasswordConfirmation,
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      toast.success("Contraseña actualizada");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "No se pudo actualizar la contraseña")),
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) {
        throw new Error("No pudimos leer tu correo");
      }
      return requestConfirmationCode({ email: user.email });
    },
    onSuccess: (message) => toast.success(typeof message === "string" ? message : "Correo reenviado"),
    onError: async (error) => {
      try {
        const result = await resendAccountConfirmationEmail();
        toast.success(result.message);
      } catch (fallbackError) {
        toast.error(getApiErrorMessage(fallbackError ?? error, "No se pudo reenviar el correo de confirmación"));
      }
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="card-pitch p-5">
        <h1 className="text-3xl font-black text-geo-green">Mi cuenta</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">Administra tu correo, nombre de usuario y contraseña.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-pitch p-5 space-y-4">
          <div>
            <h2 className="font-geo text-xl text-[var(--geo-text)]">Datos de acceso</h2>
            <p className="text-sm text-[var(--geo-text-muted)]">Tu correo principal y nombre visible.</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-4 py-3">
              <span className="block text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Correo</span>
              <span className="font-semibold text-[var(--geo-text)]">{user.email}</span>
            </div>
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Nombre de usuario</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-4 py-3 text-[var(--geo-text)]"
                placeholder="@miusuario"
              />
            </label>
            <button
              type="button"
              onClick={() => usernameMutation.mutate()}
              disabled={usernameMutation.isPending || !normalizedUsername}
              className="rounded-lg bg-geo-green px-4 py-2 font-bold text-geo-black hover:bg-geo-green-hover disabled:opacity-60"
            >
              {usernameMutation.isPending ? "Guardando…" : "Actualizar username"}
            </button>
            <div className="flex items-center gap-3 text-sm text-[var(--geo-text-muted)]">
              <span>Estado de correo:</span>
              <span className={user.confirmed ? "text-emerald-400" : "text-amber-400"}>
                {user.confirmed ? "Confirmado" : "Pendiente"}
              </span>
            </div>
            {!user.confirmed && (
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="rounded-lg border border-geo-green/40 px-4 py-2 font-semibold text-geo-green hover:bg-geo-green/10 disabled:opacity-60"
              >
                {resendMutation.isPending ? "Reenviando…" : "Reenviar correo de confirmación"}
              </button>
            )}
          </div>
        </section>

        <section className="card-pitch p-5 space-y-4">
          <div>
            <h2 className="font-geo text-xl text-[var(--geo-text)]">Cambiar contraseña</h2>
            <p className="text-sm text-[var(--geo-text-muted)]">Usa tu contraseña actual para definir una nueva.</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Contraseña actual"
              className="w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-4 py-3 text-[var(--geo-text)]"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-4 py-3 text-[var(--geo-text)]"
            />
            <input
              type="password"
              value={newPasswordConfirmation}
              onChange={(e) => setNewPasswordConfirmation(e.target.value)}
              placeholder="Confirmar nueva contraseña"
              className="w-full rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-4 py-3 text-[var(--geo-text)]"
            />
            <button
              type="button"
              onClick={() => passwordMutation.mutate()}
              disabled={passwordMutation.isPending}
              className="rounded-lg bg-geo-green px-4 py-2 font-bold text-geo-black hover:bg-geo-green-hover disabled:opacity-60"
            >
              {passwordMutation.isPending ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
