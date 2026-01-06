import NewPasswordToken from "@/components/Auth/NewPasswordToken"
import NewPasswordForm from "@/components/Auth/NewPasswordForm"
import { useState } from "react"
import type { ConfirmToken } from "@/types"

export default function NewPasswordView() {
    const [token, setToken] = useState<ConfirmToken['token']>('')
    const [isValidToken, setIsValidToken] = useState(false)

    return(
      <>
          <h1 className="text-5xl font-black text-black">Reestablecer Contraseña</h1>
          <p className="text-2xl font-ligth text-black mt-5">
              Ingresa el codigo que recibiste {''}
              <span className="text-[#0ED000] font-bold">Por email</span>
          </p>

          {!isValidToken ? 
            <NewPasswordToken token={token} setToken={setToken} setIsValidToken={setIsValidToken} /> : 
            <NewPasswordForm token={token}/>
            }
      </>
    )
}
