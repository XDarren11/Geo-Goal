import { validateToken } from "@/api/AuthAPI";
import type { ConfirmToken } from "@/types";
import { PinInput, PinInputField } from "@chakra-ui/pin-input";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

type NewPasswordTokenProps = {
  token: ConfirmToken["token"];
  setToken: React.Dispatch<React.SetStateAction<string>>;
  setIsValidToken: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function NewPasswordToken({
  token,
  setToken,
  setIsValidToken,
}: NewPasswordTokenProps) {
  const { mutate } = useMutation({
    mutationFn: validateToken,
    onError: (error) => toast.error(error.message),
    onSuccess: (data) => {
      toast.success(typeof data === "string" ? data : "Código válido");
      setIsValidToken(true);
    },
  });

  const handleChange = (value: ConfirmToken["token"]) => setToken(value);
  const handleComplete = (value: ConfirmToken["token"]) => mutate({ token: value });

  return (
    <>
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
          to="/auth/forgot-password"
          className="text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
        >
          Solicitar un nuevo código
        </Link>
      </nav>
    </>
  );
}
