import {BrowserRouter, Routes, Route} from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import DashboardView from '@/views/DashboardView'
import AuthLayout from './layouts/AuthLayout'
import LoginView from './views/Auth/LoginView'
import RegisterView from './views/Auth/RegisterView'
import ConfirmAccountView from './views/Auth/ConfirmAccountView'
import RequestNewCode from './views/Auth/RequestNewCodeView'
import ForgotPasswordView from './views/Auth/ForgotPasswordView'
import NewPasswordView from './views/Auth/NewPasswordView'

export default function Router() {

    return(
        <BrowserRouter>
            <Routes>
                <Route element={<AppLayout/>}>
                    <Route path='/' element={<DashboardView/>} index />
                </Route>

                <Route element={<AuthLayout/>}>
                    <Route path='/auth/login' element={<LoginView/>}/>
                    <Route path='/auth/register' element={<RegisterView/>}/>
                    <Route path='/auth/confirm-account' element={<ConfirmAccountView/>}/>
                    <Route path='/auth/request-code' element={<RequestNewCode/>}/>
                    <Route path='/auth/forgot-password' element={<ForgotPasswordView/>}/>
                    <Route path='/auth/new-password' element={<NewPasswordView/>}/>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}