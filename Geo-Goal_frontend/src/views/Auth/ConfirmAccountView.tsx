import { Link } from "react-router-dom";
import { PinInput, PinInputField} from '@chakra-ui/pin-input'
import { useState } from "react";
import type { ConfirmToken } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { confirmAccount } from "@/api/AuthAPI";
import { toast } from "react-toastify";

export default function ConfirmAccountView() {

    const [token, setToken] = useState<ConfirmToken['token']>('')

    const {mutate} = useMutation({
        mutationFn: confirmAccount,
        onError: (error) => {
            toast.error(error.message)
        },
        onSuccess: (data) => {
            toast.success(data)
        }
    })

    const handleChange = (token: ConfirmToken['token']) => {
        setToken(token)
    }

    const handleComplete = (token: ConfirmToken['token']) => {
        mutate({token})
    }

    return (
        <>
        <h1 className="text-5xl font-black text-black">Confirma tu Cuenta</h1>
        <p className="text-2xl font-light text-black mt-5">
            Ingresa el código que recibiste {''}
            <span className=" text-[#0ED000] font-bold"> por e-mail</span>
        </p>
        <form
            className="space-y-8 p-10 bg-white mt-10 rounded-lg border-gray-400 border"
        >
            <label
            className="font-normal text-2xl text-center block"
            >Código de 6 dígitos</label>

            <div className="flex justify-center gap-5">
                <PinInput value={token} onChange={handleChange} onComplete={handleComplete}>
                    <PinInputField className="text-center w-10 h-10 p-3 rounded-lg border-[#0ED000] border placeholder-white"/>
                    <PinInputField className="text-center w-10 h-10 p-3 rounded-lg border-[#0ED000] border placeholder-white"/>
                    <PinInputField className="text-center w-10 h-10 p-3 rounded-lg border-[#0ED000] border placeholder-white"/>
                    <PinInputField className="text-center w-10 h-10 p-3 rounded-lg border-[#0ED000] border placeholder-white"/>
                    <PinInputField className="text-center w-10 h-10 p-3 rounded-lg border-[#0ED000] border placeholder-white"/>
                    <PinInputField className="text-center w-10 h-10 p-3 rounded-lg border-[#0ED000] border placeholder-white"/>
                </PinInput>
            </div>

        </form>

        <nav className="mt-10 flex flex-col space-y-4">
            <Link
            to='/auth/request-code'
            className="text-center text-gray-500 font-normal"
            >
            Solicitar un nuevo Código
            </Link>
        </nav>

        </>
    )
}