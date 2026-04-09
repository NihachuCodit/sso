import { normalizeEmail, validateEmail } from "../../shared/email"

describe("normalizeEmail", () => {
  it("lowercases the address", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com")
  })

  it("trims surrounding whitespace", () => {
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com")
  })
})

describe("validateEmail", () => {
  it("accepts a well-formed address", () => {
    expect(() => validateEmail("user@example.com")).not.toThrow()
  })

  it("throws on an address with no @ sign", () => {
    expect(() => validateEmail("notanemail")).toThrow("Invalid email address")
  })

  it("throws on an address with no domain part", () => {
    expect(() => validateEmail("user@")).toThrow("Invalid email address")
  })

  it("throws on an address with no TLD (single-segment domain)", () => {
    expect(() => validateEmail("user@localhost")).toThrow("Invalid email address")
  })

  it("throws on an empty string", () => {
    expect(() => validateEmail("")).toThrow("Invalid email address")
  })
})
