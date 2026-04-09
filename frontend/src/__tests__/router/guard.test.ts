import { describe, it, expect, vi, beforeEach } from "vitest"
import { createRouter, createMemoryHistory } from "vue-router"
import { setActivePinia, createPinia } from "pinia"

// ── Auth store mock ────────────────────────────────────────────────────────
// We control isLoggedIn per test via this object.
const mockAuthStore = {
  init:        vi.fn().mockResolvedValue(undefined),
  isLoggedIn:  false,
}

vi.mock("../../stores/auth", () => ({
  useAuthStore: () => mockAuthStore,
}))

// Import the guard AFTER the mock is in place (vi.mock is hoisted, so this
// import order is fine — the hoisted mock wins).
import { navigationGuard } from "../../router/guard"

// ── Minimal router ─────────────────────────────────────────────────────────
// We build a memory-history router so tests never touch window.location.
function makeRouter(loggedIn: boolean) {
  mockAuthStore.isLoggedIn = loggedIn
  mockAuthStore.init.mockResolvedValue(undefined)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/login",   component: { template: "<div/>" }, meta: { public: true } },
      { path: "/register",component: { template: "<div/>" }, meta: { public: true } },
      { path: "/profile", component: { template: "<div/>" } },
      { path: "/sessions",component: { template: "<div/>" } },
      { path: "/",        redirect: "/profile" },
    ],
  })

  router.beforeEach(navigationGuard)
  return router
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ── Guard behaviour ────────────────────────────────────────────────────────

describe("navigation guard", () => {
  it("redirects an unauthenticated user to /login when visiting a protected route", async () => {
    const router = makeRouter(false)
    await router.push("/profile")
    expect(router.currentRoute.value.path).toBe("/login")
  })

  it("preserves the intended destination as a redirect query param", async () => {
    const router = makeRouter(false)
    await router.push("/sessions")
    expect(router.currentRoute.value.query.redirect).toBe("/sessions")
  })

  it("allows an unauthenticated user to reach a public route", async () => {
    const router = makeRouter(false)
    await router.push("/login")
    expect(router.currentRoute.value.path).toBe("/login")
  })

  it("redirects an authenticated user away from /login to /profile", async () => {
    const router = makeRouter(true)
    await router.push("/login")
    expect(router.currentRoute.value.path).toBe("/profile")
  })

  it("redirects an authenticated user away from /register to /profile", async () => {
    const router = makeRouter(true)
    await router.push("/register")
    expect(router.currentRoute.value.path).toBe("/profile")
  })

  it("allows an authenticated user to reach a protected route", async () => {
    const router = makeRouter(true)
    await router.push("/profile")
    expect(router.currentRoute.value.path).toBe("/profile")
  })

  it("calls auth.init() on every navigation", async () => {
    const router = makeRouter(true)
    await router.push("/profile")
    await router.push("/sessions")
    expect(mockAuthStore.init).toHaveBeenCalledTimes(2)
  })
})
