import { checkPasswordStrength } from "../../../application/security/PasswordStrength"

describe("checkPasswordStrength", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(() => checkPasswordStrength("abc")).toThrow("at least 8 characters")
  })

  it("rejects trivially guessable passwords", () => {
    expect(() => checkPasswordStrength("password")).toThrow("Password too weak")
    expect(() => checkPasswordStrength("12345678")).toThrow("Password too weak")
    expect(() => checkPasswordStrength("aaaaaaaa")).toThrow("Password too weak")
  })

  it("accepts a strong password", () => {
    expect(() => checkPasswordStrength("Tr0ub4dor&3")).not.toThrow()
    expect(() => checkPasswordStrength("correct-horse-battery-staple")).not.toThrow()
  })

  it("throws plain 'Password too weak' when zxcvbn returns no suggestions", () => {
    // Use isolateModules to override zxcvbn for this one case without
    // affecting the other tests that use the real library.
    jest.isolateModules(() => {
      jest.mock("zxcvbn", () => () => ({ score: 0, feedback: { suggestions: [] } }))
      const { checkPasswordStrength: check } =
        require("../../../application/security/PasswordStrength")
      expect(() => check("anything")).toThrow("Password too weak")
      expect(() => check("anything")).not.toThrow("Password too weak:")
    })
  })
})
