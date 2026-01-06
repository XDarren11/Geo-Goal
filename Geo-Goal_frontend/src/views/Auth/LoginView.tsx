import { useForm } from "react-hook-form";
import type { UserLoginForm } from "@/types/index";
import ErrorMessage from "@/components/ErrorMessage";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authenticateUser } from "@/api/AuthAPI";
import { toast } from "react-toastify";

export default function LoginView() {

    const initialValues: UserLoginForm = {
        email: '',
        password: '',
    }
    const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: initialValues })
    const navigate = useNavigate()

    const {mutate} = useMutation({
        mutationFn: authenticateUser,
        onError: (error) => {
            toast.error(error.message)
        },
        onSuccess: () => {
            navigate('/')
        }
    })

    const handleLogin = (formData: UserLoginForm) => {
        mutate(formData)
     }

    return (
        <>
            <h1 className="text-5xl font-black text-black">Iniciar Sesion</h1>
            <p className="text-2xl font-light text-black mt-5">
                Lleva el futbol a otro nivel{''}
                <span className=" text-[#0ED000] font-bold"> iniciando sesion en el formulario</span>
            </p>

            <form
                onSubmit={handleSubmit(handleLogin)}
                className="space-y-8 p-10 mt-10 bg-white border-gray-400 border"
                noValidate
            >
                <div className="flex flex-col gap-5">
                <label
                    className="font-normal text-2xl"
                >Email</label>

                <input
                    id="email"
                    type="email"
                    placeholder="Email de Registro"
                    className="w-full p-3  border-gray-300 border"
                    {...register("email", {
                    required: "El Email es obligatorio",
                    pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "E-mail no válido",
                    },
                    })}
                />
                {errors.email && (
                    <ErrorMessage>{errors.email.message}</ErrorMessage>
                )}
                </div>

                <div className="flex flex-col gap-5">
                <label
                    className="font-normal text-2xl"
                >Password</label>

                <input
                    type="password"
                    placeholder="Password de Registro"
                    className="w-full p-3  border-gray-300 border"
                    {...register("password", {
                    required: "El Password es obligatorio",
                    })}
                />
                {errors.password && (
                    <ErrorMessage>{errors.password.message}</ErrorMessage>
                )}
                </div>

                <input
                    type="submit"
                    value='Iniciar Sesión'
                    className="bg-[#0ED000] hover:bg-[#0aa300] w-full p-3  text-white font-black  text-xl cursor-pointer"
                />
            </form>

            <nav className="mt-10 flex flex-col space-y-4">
                <Link to={'/auth/register'} className="text-center text-gray-500 font-normal">
                    ¿No tienes cuenta? Crear Una
                </Link>

                <Link to={'/auth/forgot-password'} className="text-center text-gray-500 font-normal">
                    ¿Olvidaste tu contraseña? Reestablecer
                </Link>
            </nav>
        </>
    )
}