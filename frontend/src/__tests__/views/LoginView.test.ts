import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import LoginView from "../../views/LoginView.vue"
import { useAuthStore } from "../../stores/auth"

// ── Router mock ────────────────────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRouter: vi.fn(),
  useRoute:  vi.fn(),
  RouterLink: { template: "<a><slot /></a>" },
}))

import { useRouter, useRoute } from "vue-router"
const mockUseRouter = vi.mocked(useRouter)
const mockUseRoute  = vi.mocked(useRoute)
const mockPush      = vi.fn()

// ── API mock ───────────────────────────────────────────────────────────────
vi.mock("../../api/client", () => ({ api: { post: vi.fn(), get: vi.fn() } }))

// ── Helpers ────────────────────────────────────────────────────────────────
let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(LoginView, {
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
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
  mockUseRoute.mockReturnValue({ query: {} } as any)
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("LoginView", () => {
  it("calls auth.login with entered email and password", async () => {
    const wrapper = mountView()
    const auth    = useAuthStore()
    vi.spyOn(auth, "login").mockResolvedValue()

    await wrapper.find("#email").setValue("user@test.com")
    await wrapper.find("#password").setValue("secret123")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(auth.login).toHaveBeenCalledWith("user@test.com", "secret123")
  })

  it("redirects to /profile after successful login", async () => {
    const wrapper = mountView()
    vi.spyOn(useAuthStore(), "login").mockResolvedValue()

    await wrapper.find("#email").setValue("user@test.com")
    await wrapper.find("#password").setValue("secret123")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith("/profile")
  })

  it("redirects to the redirect query param when present", async () => {
    mockUseRoute.mockReturnValue({ query: { redirect: "/sessions" } } as any)
    const wrapper = mountView()
    vi.spyOn(useAuthStore(), "login").mockResolvedValue()

    await wrapper.find("#email").setValue("user@test.com")
    await wrapper.find("#password").setValue("secret123")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith("/sessions")
  })

  it("shows the server error message on failure", async () => {
    const wrapper = mountView()
    vi.spyOn(useAuthStore(), "login").mockRejectedValue({
      response: { data: { error: "Invalid credentials" } },
    })

    await wrapper.find("#email").setValue("user@test.com")
    await wrapper.find("#password").setValue("wrong")
    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(wrapper.find(".form-error").text()).toBe("Invalid credentials")
    expect(mockPush).not.toHaveBeenCalled()
  })
})
