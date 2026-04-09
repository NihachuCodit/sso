import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import ChangePasswordView from "../../views/ChangePasswordView.vue"
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

import { api } from "../../api/client"
const mockPost = vi.mocked(api.post)

// ── Helpers ────────────────────────────────────────────────────────────────
let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(ChangePasswordView, {
    global: {
      plugins: [pinia],
      stubs: { RouterLink: { template: "<a><slot /></a>" } },
    },
  })
}

async function fillAndSubmit(
  wrapper: ReturnType<typeof mountView>,
  current: string,
  newPw: string,
  confirm: string,
) {
  await wrapper.find("#current").setValue(current)
  await wrapper.find("#new").setValue(newPw)
  await wrapper.find("#confirm").setValue(confirm)
  await wrapper.find("form").trigger("submit")
  await flushPromises()
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  mockPush.mockReset()
  mockPost.mockReset()
  mockUseRouter.mockReturnValue({ push: mockPush } as any)
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ChangePasswordView", () => {
  it("shows a validation error when passwords do not match without calling the API", async () => {
    const wrapper = mountView()
    await fillAndSubmit(wrapper, "Old1!", "New1!", "Different!")

    expect(wrapper.find(".form-error").text()).toBe("Passwords do not match")
    expect(mockPost).not.toHaveBeenCalled()
  })

  it("calls /auth/change-password with currentPassword and newPassword", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()
    await fillAndSubmit(wrapper, "OldPass1!", "NewPass1!", "NewPass1!")

    expect(mockPost).toHaveBeenCalledWith("/auth/change-password", {
      currentPassword: "OldPass1!",
      newPassword:     "NewPass1!",
    })
  })

  it("clears auth state and shows success view on success", async () => {
    mockPost.mockResolvedValue({ data: {} })
    const wrapper = mountView()
    const auth    = useAuthStore()
    auth.user     = { userId: "u-1", email: "user@test.com" }
    sessionStorage.setItem("accessToken", "acc")

    await fillAndSubmit(wrapper, "OldPass1!", "NewPass1!", "NewPass1!")

    // Auth state cleared (refresh token is an httpOnly cookie, cleared server-side)
    expect(auth.user).toBeNull()
    expect(sessionStorage.getItem("accessToken")).toBeNull()
    // Success state visible
    expect(wrapper.find(".success-msg").exists()).toBe(true)
    expect(wrapper.find("form").exists()).toBe(false)
  })

  it("shows the API error message on failure", async () => {
    mockPost.mockRejectedValue({
      response: { data: { error: "Current password is incorrect" } },
    })
    const wrapper = mountView()
    await fillAndSubmit(wrapper, "Wrong!", "NewPass1!", "NewPass1!")

    expect(wrapper.find(".form-error").text()).toBe("Current password is incorrect")
    expect(wrapper.find("form").exists()).toBe(true)
  })
})
