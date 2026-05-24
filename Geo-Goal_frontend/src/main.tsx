import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@/context/ThemeContext'
import './index.css'
import Router from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Considera los datos frescos por 30 segundos antes de refetch automático.
      // Evita ráfagas de requests duplicadas al montar/desmontar componentes
      // (especialmente con StrictMode en desarrollo) y al cambiar de ruta.
      staleTime: 30_000,
      // No volver a pedir al enfocar la ventana — el usuario controla cuándo refrescar.
      refetchOnWindowFocus: false,
      // Reintentar una vez ante fallos transitorios (no en cada error).
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router/>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
