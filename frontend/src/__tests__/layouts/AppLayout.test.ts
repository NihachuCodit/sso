import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import AppLayout from "../../layouts/AppLayout.vue"
import { useAuthStore } from "../../stores/auth"

// ── Router mock ────────────────────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRouter:   vi.fn(),
  RouterLink:  { template: "<a><slot /></a>" },
  RouterView:  { template: "<div />" },
}))

import { useRouter } from "vue-router"
const mockUseRouter = vi.mocked(useRouter)
const mockPush      = vi.fn()

// ── API mock ───────────────────────────────────────────────────────────────
vi.mock("../../api/client", () => ({ api: { post: vi.fn() } }))

// ── Helpers ────────────────────────────────────────────────────────────────
let pinia: ReturnType<typeof createPinia>

function mountLayout() {
  return mount(AppLayout, {
    global: { plugins: [pinia] },
  })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  mockPush.mockReset()
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AppLayout", () => {
  it("renders the user email from the auth store", () => {
    const auth = useAuthStore()
    auth.user  = { userId: "u-1", email: "user@test.com" }

    const wrapper = mountLayout()

    expect(wrapper.find(".app-nav-email").text()).toBe("user@test.com")
  })

  it("calls auth.logout and redirects to /login when Sign out is clicked", async () => {
    const auth = useAuthStore()
    auth.user  = { userId: "u-1", email: "user@test.com" }
    vi.spyOn(auth, "logout").mockResolvedValue()

    const wrapper = mountLayout()
    await wrapper.find("button").trigger("click")
    await flushPromises()

    expect(auth.logout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/login")
  })
})
