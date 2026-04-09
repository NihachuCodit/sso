import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useAuthStore } from "../../stores/auth"

// Mock the API module — the store calls api.post / api.get directly
vi.mock("../../api/client", () => ({
  api: {
    post: vi.fn(),
    get:  vi.fn(),
  },
}))

import { api } from "../../api/client"
const mockPost = vi.mocked(api.post)
const mockGet  = vi.mocked(api.get)

const fakeUser = { userId: "u-1", email: "user@example.com" }

beforeEach(() => {
  setActivePinia(createPinia())
  sessionStorage.clear()
  localStorage.clear()
})

// ── isLoggedIn ─────────────────────────────────────────────────────────────

describe("isLoggedIn", () => {
  it("is false when no user is set", () => {
    expect(useAuthStore().isLoggedIn).toBe(false)
  })

  it("is true after user is populated", async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: "acc" } })
    mockGet.mockResolvedValueOnce({ data: { user: fakeUser } })

    const auth = useAuthStore()
    await auth.login("user@example.com", "pass")

    expect(auth.isLoggedIn).toBe(true)
  })
})

// ── init ───────────────────────────────────────────────────────────────────

describe("init", () => {
  it("stays unauthenticated when the refresh call fails (no cookie)", async () => {
    mockPost.mockRejectedValueOnce(new Error("401"))

    const auth = useAuthStore()
    await auth.init()

    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem("accessToken")).toBeNull()
  })

  it("exchanges cookie for an access token and fetches the profile", async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: "new-access" } })
    mockGet.mockResolvedValueOnce({ data: { user: fakeUser } })

    const auth = useAuthStore()
    await auth.init()

    expect(mockPost).toHaveBeenCalledWith("/auth/refresh")
    expect(sessionStorage.getItem("accessToken")).toBe("new-access")
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.user?.email).toBe("user@example.com")
  })

  it("clears access token when the refresh call fails", async () => {
    sessionStorage.setItem("accessToken", "old")
    mockPost.mockRejectedValueOnce(new Error("401"))

    const auth = useAuthStore()
    await auth.init()

    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem("accessToken")).toBeNull()
  })

  it("is idempotent — API is called only once regardless of how many times init is awaited", async () => {
    mockPost.mockRejectedValue(new Error("401"))

    const auth = useAuthStore()
    await auth.init()
    await auth.init()
    await auth.init()

    expect(mockPost).toHaveBeenCalledTimes(1)
  })
})

// ── login ──────────────────────────────────────────────────────────────────

describe("login", () => {
  it("stores access token and sets the user on success", async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: "acc" } })
    mockGet.mockResolvedValueOnce({ data: { user: fakeUser } })

    const auth = useAuthStore()
    await auth.login("user@example.com", "password")

    expect(sessionStorage.getItem("accessToken")).toBe("acc")
    expect(auth.user).toEqual(fakeUser)
  })

  it("propagates API errors to the caller", async () => {
    mockPost.mockRejectedValueOnce(new Error("Invalid credentials"))

    const auth = useAuthStore()
    await expect(auth.login("x@x.com", "wrong")).rejects.toThrow("Invalid credentials")
    expect(auth.isLoggedIn).toBe(false)
  })
})

// ── logout ─────────────────────────────────────────────────────────────────

describe("logout", () => {
  it("clears user and access token on success", async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: "acc" } })
    mockGet.mockResolvedValueOnce({ data: { user: fakeUser } })
    const auth = useAuthStore()
    await auth.login("user@example.com", "pass")

    mockPost.mockResolvedValueOnce({})
    await auth.logout()

    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem("accessToken")).toBeNull()
  })

  it("still clears state even when the API call throws", async () => {
    sessionStorage.setItem("accessToken", "acc")
    mockPost.mockRejectedValueOnce(new Error("Network error"))

    const auth = useAuthStore()
    auth.user = fakeUser
    await auth.logout()

    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem("accessToken")).toBeNull()
  })
})

// ── logoutAll ──────────────────────────────────────────────────────────────

describe("logoutAll", () => {
  it("clears user and access token on success", async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: "acc" } })
    mockGet.mockResolvedValueOnce({ data: { user: fakeUser } })
    const auth = useAuthStore()
    await auth.login("user@example.com", "pass")

    mockPost.mockResolvedValueOnce({})
    await auth.logoutAll()

    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem("accessToken")).toBeNull()
  })

  it("still clears state even when the API call throws", async () => {
    sessionStorage.setItem("accessToken", "acc")
    mockPost.mockRejectedValueOnce(new Error("Network error"))

    const auth = useAuthStore()
    auth.user = fakeUser
    await auth.logoutAll()

    expect(auth.isLoggedIn).toBe(false)
  })
})

// ── loginWithTokens ────────────────────────────────────────────────────────

describe("loginWithTokens", () => {
  it("stores access token and fetches the user profile", async () => {
    mockGet.mockResolvedValueOnce({ data: { user: fakeUser } })

    const auth = useAuthStore()
    await auth.loginWithTokens("new-access")

    expect(sessionStorage.getItem("accessToken")).toBe("new-access")
    expect(auth.user).toEqual(fakeUser)
  })
})

// ── clear ──────────────────────────────────────────────────────────────────

describe("clear", () => {
  it("removes user and access token", () => {
    sessionStorage.setItem("accessToken", "acc")

    const auth = useAuthStore()
    auth.user = fakeUser
    auth.clear()

    expect(auth.user).toBeNull()
    expect(sessionStorage.getItem("accessToken")).toBeNull()
  })
})
