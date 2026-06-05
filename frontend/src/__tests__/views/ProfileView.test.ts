import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import ProfileView from "../../views/ProfileView.vue"
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
vi.mock("../../api/client", () => ({ api: { post: vi.fn() } }))

vi.mock("../../composables/useToast", () => ({ useToast: () => ({ show: vi.fn() }) }))

// ── Helpers ────────────────────────────────────────────────────────────────
let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(ProfileView, {
    global: {
      plugins: [pinia],
      stubs: { RouterLink: { template: "<a><slot /></a>" } },
    },
  })
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  mockPush.mockReset()
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ProfileView", () => {
  it("displays the user email and userId from the auth store", () => {
    const auth = useAuthStore()
    auth.user  = { userId: "u-abc", email: "user@test.com" }

    const wrapper = mountView()

    expect(wrapper.text()).toContain("user@test.com")
    expect(wrapper.text()).toContain("u-abc")
  })

  it("calls auth.logoutAll and redirects to /login on 'Sign out all devices'", async () => {
    const auth = useAuthStore()
    auth.user  = { userId: "u-abc", email: "user@test.com" }
    vi.spyOn(auth, "logoutAll").mockResolvedValue()

    const wrapper = mountView()
    const btn = wrapper.findAll("button").find(b => b.text().includes("Выйти со всех устройств"))!
    await btn.trigger("click")
    await flushPromises()

    expect(auth.logoutAll).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/login")
  })
})
