import { Link } from "react-router-dom";
import { PinInput, PinInputField } from "@chakra-ui/pin-input";
import { useState } from "react";
import type { ConfirmToken } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { confirmAccount } from "@/api/AuthAPI";
import { toast } from "react-toastify";

export default function ConfirmAccountView() {
  const [token, setToken] = useState<ConfirmToken["token"]>("");

  const { mutate } = useMutation({
    mutationFn: confirmAccount,
    onError: (error) => toast.error(error.message),
    onSuccess: (data) => toast.success(typeof data === "string" ? data : "Cuenta confirmada"),
  });

  const handleChange = (value: ConfirmToken["token"]) => setToken(value);
  const handleComplete = (value: ConfirmToken["token"]) => mutate({ token: value });

  return (
    <>
      <h1 className="text-4xl font-black text-[var(--geo-text)]">
        Confirma tu cuenta
      </h1>
      <p className="mt-4 text-lg text-[var(--geo-text-muted)]">
        Ingresa el código que recibiste{" "}
        <span className="font-bold text-geo-green">por email</span>
      </p>

      <form className="mt-8 space-y-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-lg dark:shadow-none">
        <label className="block text-center text-sm font-semibold text-[var(--geo-text)]">
          Código de 6 dígitos
        </label>
        <div className="flex justify-center gap-2">
          <PinInput value={token} onChange={handleChange} onComplete={handleComplete} otp>
            <PinInputField className="h-12 w-10 rounded-lg border-2 border-geo-green bg-[var(--geo-bg)] text-center text-[var(--geo-text)] focus:border-geo-green focus:ring-1 focus:ring-geo-green" />
            <PinInputField className="h-12 w-10 rounded-lg border-2 border-geo-green bg-[var(--geo-bg)] text-center text-[var(--geo-text)] focus:border-geo-green focus:ring-1 focus:ring-geo-green" />
            <PinInputField className="h-12 w-10 rounded-lg border-2 border-geo-green bg-[var(--geo-bg)] text-center text-[var(--geo-text)] focus:border-geo-green focus:ring-1 focus:ring-geo-green" />
            <PinInputField className="h-12 w-10 rounded-lg border-2 border-geo-green bg-[var(--geo-bg)] text-center text-[var(--geo-text)] focus:border-geo-green focus:ring-1 focus:ring-geo-green" />
            <PinInputField className="h-12 w-10 rounded-lg border-2 border-geo-green bg-[var(--geo-bg)] text-center text-[var(--geo-text)] focus:border-geo-green focus:ring-1 focus:ring-geo-green" />
            <PinInputField className="h-12 w-10 rounded-lg border-2 border-geo-green bg-[var(--geo-bg)] text-center text-[var(--geo-text)] focus:border-geo-green focus:ring-1 focus:ring-geo-green" />
          </PinInput>
        </div>
      </form>

      <nav className="mt-6 text-center">
        <Link
          to="/auth/request-code"
          className="text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
        >
          Solicitar un nuevo código
        </Link>
      </nav>
    </>
  );
}
