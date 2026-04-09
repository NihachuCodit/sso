import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import RegisterView from "../../views/RegisterView.vue"

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
  return mount(RegisterView, {
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

describe("RegisterView", () => {
  it("calls /auth/register then /auth/otp on submit", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()

    await wrapper.find("#email").setValue("new@test.com")
    await wrapper.find("#password").setValue("Password1!")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPost).toHaveBeenNthCalledWith(1, "/auth/register", {
      email:    "new@test.com",
      password: "Password1!",
    })
    expect(mockPost).toHaveBeenNthCalledWith(2, "/auth/otp", { email: "new@test.com" })
  })

  it("redirects to /verify-otp with the email in history state", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()

    await wrapper.find("#email").setValue("new@test.com")
    await wrapper.find("#password").setValue("Password1!")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({
      path:  "/verify-otp",
      state: { email: "new@test.com" },
    })
  })

  it("shows the error message when registration fails", async () => {
    mockPost.mockRejectedValue({ response: { data: { error: "Email already taken" } } })
    const wrapper = mountView()

    await wrapper.find("#email").setValue("existing@test.com")
    await wrapper.find("#password").setValue("Password1!")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(wrapper.find(".form-error").text()).toBe("Email already taken")
    expect(mockPush).not.toHaveBeenCalled()
  })
})
