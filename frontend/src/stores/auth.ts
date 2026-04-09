import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { api } from "../api/client"

export interface AuthUser {
  userId: string
  email:  string
}

export const useAuthStore = defineStore("auth", () => {
  // Access token lives only in sessionStorage (cleared on tab close).
  // Refresh token is an httpOnly cookie managed entirely by the server —
  // the frontend never reads, writes, or stores it.
  const user         = ref<AuthUser | null>(null)
  const initialised  = ref(false)

  const isLoggedIn = computed(() => user.value !== null)

  // ── Bootstrap ────────────────────────────────────────────────────────────
  // Called once on app mount. Tries a silent refresh (cookie is sent
  // automatically) so the user stays logged in across page reloads.
  async function init() {
    if (initialised.value) return
    initialised.value = true

    try {
      const { data } = await api.post<{ accessToken: string }>("/auth/refresh")
      sessionStorage.setItem("accessToken", data.accessToken)
      await fetchProfile()
    } catch {
      // No valid cookie or refresh failed — clear any stale access token
      clear()
    }
  }

  // ── Auth actions ─────────────────────────────────────────────────────────
  async function login(email: string, password: string) {
    const { data } = await api.post<{ accessToken: string }>("/auth/login", { email, password })
    sessionStorage.setItem("accessToken", data.accessToken)
    await fetchProfile()
  }

  async function logout() {
    try {
      await api.post("/auth/logout")
    } catch {
      // Server-side failure is non-critical — always clear client state
    }
    clear()
  }

  async function logoutAll() {
    try {
      await api.post("/auth/logout-all")
    } catch {
      // Server-side failure is non-critical — always clear client state
    }
    clear()
  }

  // Called after OTP verification or any flow that returns an access token directly
  async function loginWithTokens(accessToken: string) {
    sessionStorage.setItem("accessToken", accessToken)
    await fetchProfile()
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  async function fetchProfile() {
    const { data } = await api.get<{ user: AuthUser }>("/auth/profile")
    user.value = data.user
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function clear() {
    user.value = null
    sessionStorage.removeItem("accessToken")
  }

  return { user, isLoggedIn, initialised, init, login, loginWithTokens, logout, logoutAll, fetchProfile, clear }
})
