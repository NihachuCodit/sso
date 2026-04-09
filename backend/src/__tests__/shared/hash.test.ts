import { sha256, hashPassword, comparePassword } from "../../shared/hash"

describe("sha256", () => {
  it("returns a 64-character hex string", () => {
    expect(sha256("hello")).toMatch(/^[0-9a-f]{64}$/)
  })

  it("is deterministic", () => {
    expect(sha256("abc")).toBe(sha256("abc"))
  })

  it("produces different output for different inputs", () => {
    expect(sha256("abc")).not.toBe(sha256("xyz"))
  })
})

describe("hashPassword / comparePassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("MySecurePass1!")
    expect(await comparePassword("MySecurePass1!", hash)).toBe(true)
  })

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("MySecurePass1!")
    expect(await comparePassword("wrong", hash)).toBe(false)
  })

  it("produces different hashes for the same input (salt)", async () => {
    const a = await hashPassword("MySecurePass1!")
    const b = await hashPassword("MySecurePass1!")
    expect(a).not.toBe(b)
  })
})
