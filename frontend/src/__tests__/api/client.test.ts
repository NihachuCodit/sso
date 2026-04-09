import { describe, it, expect, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"
import { api } from "../../api/client"

const mock = new MockAdapter(api)

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  mock.reset()
})

afterEach(() => {
  mock.reset()
})

// ── Request interceptor ────────────────────────────────────────────────────

describe("request interceptor", () => {
  it("attaches Authorization header when accessToken is in sessionStorage", async () => {
    sessionStorage.setItem("accessToken", "test-token")

    let capturedHeader: string | undefined
    mock.onGet("/test").reply((config) => {
      capturedHeader = config.headers?.Authorization as string
      return [200, {}]
    })

    await api.get("/test")
    expect(capturedHeader).toBe("Bearer test-token")
  })

  it("does not add Authorization header when no token is stored", async () => {
    let capturedHeader: string | undefined
    mock.onGet("/test").reply((config) => {
      capturedHeader = config.headers?.Authorization as string
      return [200, {}]
    })

    await api.get("/test")
    expect(capturedHeader).toBeUndefined()
  })
})

// ── Response interceptor ───────────────────────────────────────────────────

describe("response interceptor", () => {
  it("passes through successful responses unchanged", async () => {
    mock.onGet("/ok").reply(200, { value: 42 })
    const res = await api.get("/ok")
    expect(res.data).toEqual({ value: 42 })
  })

  it("passes through non-401 errors without attempting a refresh", async () => {
    mock.onGet("/bad").reply(403)
    await expect(api.get("/bad")).rejects.toMatchObject({ response: { status: 403 } })
    // refresh endpoint must not have been called
    expect(mock.history.post).toHaveLength(0)
  })

  it("on 401 retries the request with a fresh token after a successful refresh", async () => {
    localStorage.setItem("refreshToken", "old-refresh")

    mock.onGet("/protected").replyOnce(401)
    mock.onGet("/protected").reply(200, { secret: true })
    mock.onPost("/auth/refresh").reply(200, { accessToken: "new-access" })

    const res = await api.get("/protected")

    expect(res.data).toEqual({ secret: true })
    expect(sessionStorage.getItem("accessToken")).toBe("new-access")
  })

  it("on 401 calls the refresh endpoint with no body (cookie is sent automatically)", async () => {
    mock.onGet("/protected").replyOnce(401)
    mock.onGet("/protected").reply(200, {})
    mock.onPost("/auth/refresh").reply((config) => {
      // refresh token is in httpOnly cookie, not the request body
      expect(config.data).toBeFalsy()
      return [200, { accessToken: "new-access" }]
    })

    await api.get("/protected")
  })

  it("clears the access token and rejects when the refresh call itself returns 401", async () => {
    sessionStorage.setItem("accessToken", "old-access")

    mock.onGet("/protected").reply(401)
    mock.onPost("/auth/refresh").reply(401)

    await expect(api.get("/protected")).rejects.toMatchObject({ response: { status: 401 } })

    expect(sessionStorage.getItem("accessToken")).toBeNull()
  })

  it("does not retry a second time if the retried request also returns 401", async () => {
    localStorage.setItem("refreshToken", "refresh")

    mock.onGet("/protected").reply(401)
    mock.onPost("/auth/refresh").reply(200, { accessToken: "new" })

    // Both the original request and the retry return 401 — should not loop
    await expect(api.get("/protected")).rejects.toMatchObject({ response: { status: 401 } })
    expect(mock.history.post).toHaveLength(1) // exactly one refresh attempt
  })
})
