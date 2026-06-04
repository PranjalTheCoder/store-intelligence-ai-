/**
 * services/apiClient.ts
 *
 * Single Axios instance used by ALL query hooks.
 *
 * Root cause fix: previous code had api.ts AND apiClient.ts both creating
 * separate axios instances with different baseURLs, causing some calls
 * to hit localhost:3000 (Vite proxy) and others to fail with CORS errors.
 *
 * Resolution: ONE instance. Vite proxy forwards /stores/* and /health to
 * the FastAPI backend at localhost:8000, so baseURL can stay as ''.
 * In production (Docker) set VITE_API_URL env var.
 */
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? ''

export const apiClient = axios.create({
  baseURL: BASE,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor — never let raw Axios errors bubble uncaught
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err?.response?.data?.message ?? err?.message ?? 'Network error'
    return Promise.reject(new Error(msg))
  }
)
