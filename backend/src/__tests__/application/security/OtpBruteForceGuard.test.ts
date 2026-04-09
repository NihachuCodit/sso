import { verifyOtpWithBruteForceGuard } from "../../../application/security/OtpBruteForceGuard"
import { sha256 } from "../../../shared/hash"

jest.mock("../../../infrastructure/prisma", () => ({
  prisma: {
    otp: {
      findFirst: jest.fn(),
      update:    jest.fn(),
    },
  },
}))

import { prisma } from "../../../infrastructure/prisma"
const mockOtp = prisma.otp as jest.Mocked<typeof prisma.otp>

const validRecord = (overrides: object = {}) => ({
  id:        "otp-1",
  userId:    "user-1",
  code:      sha256("123456"),
  attempts:  0,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  used:      false,
  ...overrides,
})

beforeEach(() => jest.clearAllMocks())

describe("verifyOtpWithBruteForceGuard", () => {
  it("throws Invalid OTP when no record found (with delay)", async () => {
    mockOtp.findFirst.mockResolvedValue(null)
    await expect(verifyOtpWithBruteForceGuard("user-1", "123456"))
      .rejects.toThrow("Invalid OTP")
  })

  it("throws when attempt limit is reached within the window", async () => {
    mockOtp.findFirst.mockResolvedValue(
      validRecord({ attempts: 5, createdAt: new Date() })
    )
    await expect(verifyOtpWithBruteForceGuard("user-1", "123456"))
      .rejects.toThrow("Too many attempts")
  })

  it("allows retry when the brute-force window has passed", async () => {
    const oldDate = new Date(Date.now() - 10 * 60 * 1000) // 10 min ago
    mockOtp.findFirst.mockResolvedValue(
      validRecord({ attempts: 5, createdAt: oldDate })
    )
    mockOtp.update.mockResolvedValue({} as any)
    // Should not throw on brute-force, falls through to code check
    await expect(verifyOtpWithBruteForceGuard("user-1", "wrong"))
      .rejects.toThrow("Invalid OTP")
  })

  it("throws OTP expired when past expiresAt", async () => {
    mockOtp.findFirst.mockResolvedValue(
      validRecord({ expiresAt: new Date(Date.now() - 1) })
    )
    await expect(verifyOtpWithBruteForceGuard("user-1", "123456"))
      .rejects.toThrow("OTP expired")
  })

  it("increments attempts and throws on wrong code", async () => {
    mockOtp.findFirst.mockResolvedValue(validRecord())
    mockOtp.update.mockResolvedValue({} as any)

    await expect(verifyOtpWithBruteForceGuard("user-1", "000000"))
      .rejects.toThrow("Invalid OTP")

    expect(mockOtp.update).toHaveBeenCalledWith({
      where: { id: "otp-1" },
      data:  { attempts: { increment: 1 } },
    })
  })

  it("marks OTP as used and returns the record on correct code", async () => {
    const record = validRecord()
    mockOtp.findFirst.mockResolvedValue(record)
    mockOtp.update.mockResolvedValue({ ...record, used: true } as any)

    const result = await verifyOtpWithBruteForceGuard("user-1", "123456")

    expect(mockOtp.update).toHaveBeenCalledWith({
      where: { id: "otp-1" },
      data:  { used: true },
    })
    expect(result).toMatchObject({ id: "otp-1" })
  })
})
