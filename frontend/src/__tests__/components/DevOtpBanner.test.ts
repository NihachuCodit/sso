import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import DevOtpBanner from "../../components/DevOtpBanner.vue"

describe("DevOtpBanner", () => {
  it("renders the OTP fetch URL when in dev mode", () => {
    // import.meta.env.DEV is true in the Vitest environment
    const wrapper = mount(DevOtpBanner, { props: { email: "user@test.com" } })

    expect(wrapper.find(".dev-banner").exists()).toBe(true)
    expect(wrapper.text()).toContain("user@test.com")
    expect(wrapper.text()).toContain("/dev/otp")
  })

  it("is hidden when DEV is false", () => {
    vi.stubEnv("DEV", false)
    const wrapper = mount(DevOtpBanner, { props: { email: "user@test.com" } })

    expect(wrapper.find(".dev-banner").exists()).toBe(false)

    vi.unstubAllEnvs()
  })
})
