import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import VerifyOtpView from "../../views/VerifyOtpView.vue"
import { useAuthStore } from "../../stores/auth"

// ── Router mock ────────────────────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRouter: vi.fn(),
  RouterLink: { template: "<a><slot /></a>" },
}))

import { useRouter } from "vue-router"
const mockUseRouter = vi.mocked(useRouter)
const mockPush      = vi.fn()

// ── API mock ───────────────────────────────────────────────────────────────
vi.mock("../../api/client", () => ({ api: { post: vi.fn(), get: vi.fn() } }))

import { api } from "../../api/client"
const mockPost = vi.mocked(api.post)

// ── Helpers ────────────────────────────────────────────────────────────────
let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(VerifyOtpView, {
    global: {
      plugins: [pinia],
      stubs: {
        AuthCard: { template: "<div><slot /></div>" },
      },
    },
  })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  mockPush.mockReset()
  mockPost.mockReset()
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
  // Simulate navigation from RegisterView with email in history state
  window.history.replaceState({ email: "user@test.com" }, "")
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("VerifyOtpView", () => {
  it("pre-fills email from history state", () => {
    // The component reads history.state.email on setup; it should be visible
    // in the subtitle rendered by AuthCard — we verify the ref itself instead
    const wrapper = mountView()
    // email ref is passed as :subtitle prop; AuthCard is stubbed, but the
    // component's reactive state can be inspected via vm
    expect((wrapper.vm as any).email).toBe("user@test.com")
  })

  it("calls /auth/verify-otp with email and code on submit", async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: "acc" },
    })
    const wrapper = mountView()
    const auth    = useAuthStore()
    vi.spyOn(auth, "loginWithTokens").mockResolvedValue()

    await wrapper.find("#otp").setValue("123456")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith("/auth/verify-otp", {
      email: "user@test.com",
      otp:   "123456",
    })
  })

  it("stores tokens and redirects to /profile on success", async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: "acc" },
    })
    const wrapper = mountView()
    const auth    = useAuthStore()
    vi.spyOn(auth, "loginWithTokens").mockResolvedValue()

    await wrapper.find("#otp").setValue("123456")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(auth.loginWithTokens).toHaveBeenCalledWith("acc")
    expect(mockPush).toHaveBeenCalledWith("/profile")
  })

  it("shows error message on invalid OTP", async () => {
    mockPost.mockRejectedValue({ response: { data: { error: "Invalid or expired OTP" } } })
    const wrapper = mountView()
    vi.spyOn(useAuthStore(), "loginWithTokens").mockResolvedValue()

    await wrapper.find("#otp").setValue("000000")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(wrapper.find(".form-error").text()).toBe("Invalid or expired OTP")
  })

  it("resend calls /auth/otp with the email", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()

    await wrapper.find("a").trigger("click")
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith("/auth/otp", { email: "user@test.com" })
  })
})
