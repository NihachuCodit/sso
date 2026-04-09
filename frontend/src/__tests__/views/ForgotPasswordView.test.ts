import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import ForgotPasswordView from "../../views/ForgotPasswordView.vue"

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
  return mount(ForgotPasswordView, {
    global: {
      plugins: [pinia],
      stubs: { AuthCard: { template: "<div><slot /></div>" } },
    },
  })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  mockPush.mockReset()
  mockPost.mockReset()
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ForgotPasswordView", () => {
  it("calls /auth/otp with the entered email", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()

    await wrapper.find("#email").setValue("user@test.com")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPost).toHaveBeenCalledWith("/auth/otp", { email: "user@test.com" })
  })

  it("redirects to /reset-password with email in history state", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()

    await wrapper.find("#email").setValue("user@test.com")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({
      path:  "/reset-password",
      state: { email: "user@test.com" },
    })
  })

  it("shows error when user is not found", async () => {
    mockPost.mockRejectedValue({ response: { data: { error: "User not found" } } })
    const wrapper = mountView()

    await wrapper.find("#email").setValue("nobody@test.com")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(wrapper.find(".form-error").text()).toBe("User not found")
    expect(mockPush).not.toHaveBeenCalled()
  })
})
