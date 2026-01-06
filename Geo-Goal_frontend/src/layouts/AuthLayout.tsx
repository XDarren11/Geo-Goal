import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";


export default function AuthLayout() {
    return (
        <>
            <div className="bg-slate-100 min-h-screen">
                <div className="py-10 lg:py-20 mx-auto w-[450px]">
                    <div className="m-10">
                        <Outlet/>
                    </div>
                </div>
            </div>

            <ToastContainer
                pauseOnHover={false}
                pauseOnFocusLoss={false}
            />
        </>        
    )
}
