import { generateOtp } from "../../shared/otp"

describe("generateOtp", () => {
  it("returns a 6-digit string", () => {
    const code = generateOtp()
    expect(code).toMatch(/^\d{6}$/)
  })

  it("never returns fewer than 6 digits (no leading-zero collapse)", () => {
    // Run many times to catch edge cases around 100000
    for (let i = 0; i < 200; i++) {
      expect(generateOtp()).toHaveLength(6)
    }
  })

  it("produces varied output across calls", () => {
    const codes = new Set(Array.from({ length: 50 }, generateOtp))
    // 50 calls from a 900,000-value range — collision would be extraordinary
    expect(codes.size).toBeGreaterThan(1)
  })
})
