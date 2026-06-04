import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { DashboardPage } from './pages/DashboardPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults — individual hooks override with tighter values
      retry:           2,
      staleTime:       4_000,
      gcTime:          60_000,
      refetchOnWindowFocus: true,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  </StrictMode>
)
