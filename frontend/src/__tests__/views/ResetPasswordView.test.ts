import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import ResetPasswordView from "../../views/ResetPasswordView.vue"

// ── Router mock ────────────────────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRouter: vi.fn(),
  RouterLink: { template: "<a><slot /></a>" },
}))

import { useRouter } from "vue-router"
const mockUseRouter = vi.mocked(useRouter)
const mockPush      = vi.fn()

// ── API mock ───────────────────────────────────────────────────────────────
vi.mock("../../api/client", () => ({ api: { post: vi.fn() } }))

import { api } from "../../api/client"
const mockPost = vi.mocked(api.post)

// ── Helpers ────────────────────────────────────────────────────────────────
let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(ResetPasswordView, {
    global: {
      plugins: [pinia],
      stubs: {
        AuthCard:     { template: "<div><slot /></div>" },
        DevOtpBanner: true,
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
  window.history.replaceState({ email: "user@test.com" }, "")
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ResetPasswordView", () => {
  it("shows a validation error when passwords do not match without calling the API", async () => {
    const wrapper = mountView()

    await wrapper.find("#otp").setValue("123456")
    await wrapper.find("#password").setValue("NewPass1!")
    await wrapper.find("#confirm").setValue("Different1!")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(wrapper.find(".form-error").text()).toBe("Passwords do not match")
    expect(mockPost).not.toHaveBeenCalled()
  })

  it("calls /auth/reset-password with email, otp and newPassword", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()

    await wrapper.find("#otp").setValue("123456")
    await wrapper.find("#password").setValue("NewPass1!")
    await wrapper.find("#confirm").setValue("NewPass1!")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith("/auth/reset-password", {
      email:       "user@test.com",
      otp:         "123456",
      newPassword: "NewPass1!",
    })
  })

  it("redirects to /login on success", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()

    await wrapper.find("#otp").setValue("123456")
    await wrapper.find("#password").setValue("NewPass1!")
    await wrapper.find("#confirm").setValue("NewPass1!")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith("/login")
  })

  it("shows the API error message on failure", async () => {
    mockPost.mockRejectedValue({ response: { data: { error: "Invalid or expired OTP" } } })
    const wrapper = mountView()

    await wrapper.find("#otp").setValue("000000")
    await wrapper.find("#password").setValue("NewPass1!")
    await wrapper.find("#confirm").setValue("NewPass1!")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(wrapper.find(".form-error").text()).toBe("Invalid or expired OTP")
  })
})
