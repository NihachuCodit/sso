import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import SessionsView from "../../views/SessionsView.vue"

// ── API mock ───────────────────────────────────────────────────────────────
vi.mock("../../api/client", () => ({
  api: { get: vi.fn(), delete: vi.fn() },
}))

import { api } from "../../api/client"
const mockGet    = vi.mocked(api.get)
const mockDelete = vi.mocked(api.delete)

// ── Fixtures ───────────────────────────────────────────────────────────────
const activeSession = {
  id:             "s-1",
  familyId:       "f-1",
  refreshCounter: 2,
  deviceInfo:     null,
  revoked:        false,
  lastUsedAt:     "2026-04-01T12:00:00.000Z",
  createdAt:      "2026-03-28T10:00:00.000Z",
}

const revokedSession = {
  ...activeSession,
  id:      "s-2",
  revoked: true,
}

// Default paginated response
function sessionsResponse(sessions: typeof activeSession[]) {
  return { data: { sessions, pages: 1 } }
}

// ── Helpers ────────────────────────────────────────────────────────────────
let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(SessionsView, {
    global: { plugins: [pinia] },
  })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  mockGet.mockReset()
  mockDelete.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SessionsView", () => {
  it("fetches and renders sessions on mount", async () => {
    mockGet.mockResolvedValue(sessionsResponse([{ ...activeSession }, { ...revokedSession }]))
    const wrapper = mountView()
    await flushPromises()

    const items = wrapper.findAll(".session-item")
    expect(items).toHaveLength(2)
    // URL now includes query params for status/limit/page
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/sessions"))
  })

  it("shows 'Active' badge for non-revoked and 'Revoked' for revoked sessions", async () => {
    mockGet.mockResolvedValue(sessionsResponse([{ ...activeSession }, { ...revokedSession }]))
    const wrapper = mountView()
    await flushPromises()

    const badges = wrapper.findAll(".session-badge")
    expect(badges[0].text()).toBe("Активна")
    expect(badges[1].text()).toBe("Отозвана")
  })

  it("shows 'Unknown device' when deviceInfo is null", async () => {
    mockGet.mockResolvedValue(sessionsResponse([{ ...activeSession }]))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find(".session-device").text()).toBe("Неизвестное устройство")
  })

  it("calls DELETE /sessions/:id and marks the session revoked in place", async () => {
    mockGet.mockResolvedValue(sessionsResponse([{ ...activeSession }]))
    mockDelete.mockResolvedValue({ data: {} })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find(".btn-sm.danger").trigger("click")
    await flushPromises()

    expect(mockDelete).toHaveBeenCalledWith("/sessions/s-1")
    // Badge should now read "Revoked" without a page reload
    expect(wrapper.find(".session-badge").text()).toBe("Отозвана")
    expect(wrapper.find(".btn-sm.danger").exists()).toBe(false)
  })

  it("shows an error message when the initial fetch fails", async () => {
    mockGet.mockRejectedValue({ response: { data: { error: "Unauthorized" } } })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find(".form-error").text()).toBe("Unauthorized")
  })

  it("shows an error when the revoke API call fails", async () => {
    mockGet.mockResolvedValue(sessionsResponse([{ ...activeSession }]))
    mockDelete.mockRejectedValue({ response: { data: { error: "Session not found" } } })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find(".btn-sm.danger").trigger("click")
    await flushPromises()

    expect(wrapper.find(".form-error").text()).toBe("Session not found")
    // Session should not be marked revoked after failure
    expect(wrapper.find(".session-badge").text()).toBe("Активна")
  })

  it("renders deviceInfo userAgent from a JSON string", async () => {
    const session = { ...activeSession, deviceInfo: JSON.stringify({ userAgent: "Chrome/120" }) }
    mockGet.mockResolvedValue(sessionsResponse([session]))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find(".session-device").text()).toBe("Chrome/120")
  })

  it("falls back to raw string when deviceInfo is not valid JSON", async () => {
    const session = { ...activeSession, deviceInfo: "raw-fingerprint" }
    mockGet.mockResolvedValue(sessionsResponse([session]))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find(".session-device").text()).toBe("raw-fingerprint")
  })
})
