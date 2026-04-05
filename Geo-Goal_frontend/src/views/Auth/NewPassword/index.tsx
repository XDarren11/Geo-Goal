import NewPasswordToken from "@/components/Auth/NewPasswordToken";
import NewPasswordForm from "@/components/Auth/NewPasswordForm";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { ConfirmToken } from "@/types";

export default function NewPasswordView() {
  const { token: tokenParam } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = tokenParam || searchParams.get("token") || "";

  const [token, setToken] = useState<ConfirmToken["token"]>(tokenFromUrl);
  const [isValidToken, setIsValidToken] = useState(!!tokenFromUrl);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setIsValidToken(true);
    }
  }, [tokenFromUrl]);

  return (
    <>
      <h1 className="text-4xl font-black text-[var(--geo-text)]">
        Nueva contraseña
      </h1>
      <p className="mt-4 text-lg text-[var(--geo-text-muted)]">
        {!isValidToken ? (
          <>
            Ingresa el código que recibiste{" "}
            <span className="font-bold text-geo-green">por email</span>
          </>
        ) : (
          <>
            Define tu nueva contraseña{" "}
            <span className="font-bold text-geo-green">segura</span>
          </>
        )}
      </p>

      {!isValidToken ? (
        <NewPasswordToken
          token={token}
          setToken={setToken}
          setIsValidToken={setIsValidToken}
        />
      ) : (
        <NewPasswordForm token={token} />
      )}
    </>
  );
}
