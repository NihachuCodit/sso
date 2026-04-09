import axios from "axios"

export const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  headers:         { "Content-Type": "application/json" },
  withCredentials: true,  // send httpOnly refresh_token cookie on every request
})

// ── Request interceptor — attach access token ──────────────────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("accessToken")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor — silent refresh on 401 ──────────────────────────
let refreshing: Promise<string> | null = null

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config

    // Only attempt refresh once per request, only on 401, and never for the
    // refresh endpoint itself (which would cause an infinite retry loop).
    if (
      err.response?.status !== 401 ||
      original._retried ||
      original.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(err)
    }
    original._retried = true

    try {
      // Deduplicate concurrent refresh calls — cookie is sent automatically
      if (!refreshing) {
        refreshing = api
          .post<{ accessToken: string }>("/auth/refresh")
          .then((r) => {
            sessionStorage.setItem("accessToken", r.data.accessToken)
            return r.data.accessToken
          })
          .finally(() => { refreshing = null })
      }

      const newToken = await refreshing
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      // Refresh failed — clear access token and let the caller handle the rejection
      sessionStorage.removeItem("accessToken")
      return Promise.reject(err)
    }
  },
)
