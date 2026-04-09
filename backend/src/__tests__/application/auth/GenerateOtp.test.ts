import { generateOtp } from "../../../application/auth/GenerateOtp"
import { sha256 } from "../../../shared/hash"

jest.mock("../../../infrastructure/prisma", () => ({
  prisma: {
    otp: {
      updateMany: jest.fn(),
      create:     jest.fn(),
    },
    // Simulate the array form of $transaction by resolving each operation in order
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}))

// Dev cache is a no-op in this test environment (NODE_ENV=test, but we just
// let it run — it's an in-memory Map and has no side effects on other tests)
jest.mock("../../../infrastructure/dev/otpCache", () => ({
  devCacheOtp: jest.fn(),
}))

// Mailer is only called in production; mock it to avoid requiring a real API key
jest.mock("../../../infrastructure/email/mailer", () => ({
  sendMail: jest.fn(),
}))

import { prisma } from "../../../infrastructure/prisma"
const mockOtp = prisma.otp as jest.Mocked<typeof prisma.otp>

beforeEach(() => jest.clearAllMocks())

describe("generateOtp", () => {
  it("invalidates any existing unused OTPs for the user", async () => {
    mockOtp.updateMany.mockResolvedValue({ count: 1 } as any)
    mockOtp.create.mockResolvedValue({} as any)

    await generateOtp("user-1", "user@example.com")

    expect(mockOtp.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", used: false },
      data:  { used: true },
    })
  })

  it("stores the SHA256 hash of the code, not the plaintext", async () => {
    mockOtp.updateMany.mockResolvedValue({ count: 0 } as any)
    mockOtp.create.mockResolvedValue({} as any)

    const plaintext = await generateOtp("user-1", "user@example.com")

    const createCall = mockOtp.create.mock.calls[0][0]
    expect(createCall.data.code).toBe(sha256(plaintext))
    expect(createCall.data.code).not.toBe(plaintext)
  })

  it("returns the plaintext code (for delivery)", async () => {
    mockOtp.updateMany.mockResolvedValue({ count: 0 } as any)
    mockOtp.create.mockResolvedValue({} as any)

    const code = await generateOtp("user-1", "user@example.com")

    expect(code).toMatch(/^\d{6}$/)
  })

  it("sets an expiry ~5 minutes in the future", async () => {
    mockOtp.updateMany.mockResolvedValue({ count: 0 } as any)
    mockOtp.create.mockResolvedValue({} as any)

    const before = Date.now()
    await generateOtp("user-1", "user@example.com")
    const after = Date.now()

    const { expiresAt } = mockOtp.create.mock.calls[0][0].data
    const expiresMs = new Date(expiresAt).getTime()

    expect(expiresMs).toBeGreaterThan(before + 4 * 60 * 1000)
    expect(expiresMs).toBeLessThan(after  + 6 * 60 * 1000)
  })
})
