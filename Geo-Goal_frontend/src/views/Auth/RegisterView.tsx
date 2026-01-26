import { useForm } from "react-hook-form";
import type { UserRegistrationForm } from "@/types/index";
import ErrorMessage from "@/components/ErrorMessage";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { createAccount } from "@/api/AuthAPI";
import { toast } from "react-toastify";

export default function RegisterView() {
  
    const initialValues: UserRegistrationForm = {
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: ''
    }

    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<UserRegistrationForm>({ defaultValues: initialValues });

    const { mutate } = useMutation({
        mutationFn: createAccount,
        onError: (error) => {
            toast.error(error.message)
        },
        onSuccess: (data) => {
            toast.success(data)
            reset()
        }
    })

    const password = watch('password');

    const handleRegister = (formData: UserRegistrationForm) => {
        mutate(formData)
    }

    return (
        <>
        <h1 className="text-5xl font-black text-black">Crear Cuenta</h1>
        <p className="text-2xl font-light text-black mt-5">
            Llena el formulario para {''}
            <span className=" text-[#0ED000] font-bold"> crear tu cuenta</span>
        </p>

        <form
            onSubmit={handleSubmit(handleRegister)}
            className="space-y-8 p-10  bg-white mt-10 border-gray-400 border"
            noValidate
        >
            <div className="flex flex-col gap-5">
            <label
                className="font-normal text-2xl"
                htmlFor="email"
            >Email</label>
            <input
                id="email"
                type="email"
                placeholder="Email de Registro"
                className="w-full p-3  border-gray-300 border"
                {...register("email", {
                required: "El Email de registro es obligatorio",
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
            >Nombre</label>
            <input
                type="name"
                placeholder="Nombre de Registro"
                className="w-full p-3  border-gray-300 border"
                {...register("name", {
                required: "El Nombre de usuario es obligatorio",
                })}
            />
            {errors.name && (
                <ErrorMessage>{errors.name.message}</ErrorMessage>
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
                minLength: {
                    value: 8,
                    message: 'El Password debe ser mínimo de 8 caracteres'
                }
                })}
            />
            {errors.password && (
                <ErrorMessage>{errors.password.message}</ErrorMessage>
            )}
            </div>

            <div className="flex flex-col gap-5">
            <label
                className="font-normal text-2xl"
            >Repetir Password</label>

            <input
                id="password_confirmation"
                type="password"
                placeholder="Repite Password de Registro"
                className="w-full p-3  border-gray-300 border"
                {...register("password_confirmation", {
                required: "Repetir Password es obligatorio",
                validate: value => value === password || 'Los Passwords no son iguales'
                })}
            />

            {errors.password_confirmation && (
                <ErrorMessage>{errors.password_confirmation.message}</ErrorMessage>
            )}
            </div>

            <div className="flex flex-col gap-5">
                <label
                    className="font-normal text-2xl"
                    htmlFor="role"
                >¿Qué deseas hacer?</label>
                
                <select
                    id="role"
                    className="w-full p-3 border-gray-300 border bg-white"
                    {...register("role", {
                        required: "Seleccionar un rol es obligatorio"
                    })}
                >
                    <option value="player">Soy Jugador</option>
                    <option value="coach">Soy Entrenador</option>
                    <option value="admin">Organizador</option>
                </select>

                {errors.role && (
                    <ErrorMessage>{errors.role.message}</ErrorMessage>
                )}
            </div>

            <input
            type="submit"
            value='Registrarme'
            className="bg-[#0ED000] hover:bg-[#0aa300] w-full p-3  text-white font-black  text-xl cursor-pointer"
            />
        </form>

        <nav className="mt-10 flex flex-col space-y-4">
                <Link to={'/auth/login'} className="text-center text-gray-500 font-normal">
                    ¿Ya tienes cuenta? Iniciar Sesion
                </Link>

                <Link to={'/auth/forgot-password'} className="text-center text-gray-500 font-normal">
                    ¿Olvidaste tu contraseña? Reestablecer
                </Link>
            </nav>
        </>
    )
}