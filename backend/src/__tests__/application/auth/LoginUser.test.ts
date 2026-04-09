import { loginUser } from "../../../application/auth/LoginUser"

jest.mock("../../../infrastructure/prisma", () => ({
  prisma: {
    user:         { findUnique: jest.fn() },
    session:      { create: jest.fn() },
    refreshToken: { create: jest.fn() },
  },
}))

jest.mock("../../../infrastructure/audit/auditLogger", () => ({
  logAuditEvent: jest.fn(),
}))

jest.mock("../../../shared/hash", () => ({
  ...jest.requireActual("../../../shared/hash"),
  comparePassword: jest.fn(),
}))

jest.mock("../../../infrastructure/anomaly/AnomalyDetector", () => ({
  detectLoginAnomalies: jest.fn().mockResolvedValue([]),
}))

jest.mock("../../../application/security/LoginBruteForceGuard", () => ({
  checkLoginBruteForce: jest.fn().mockResolvedValue(undefined),
}))

import { prisma } from "../../../infrastructure/prisma"
import { comparePassword } from "../../../shared/hash"
const mockUser         = prisma.user         as jest.Mocked<typeof prisma.user>
const mockSession      = prisma.session      as jest.Mocked<typeof prisma.session>
const mockRefreshToken = prisma.refreshToken as jest.Mocked<typeof prisma.refreshToken>
const mockCompare      = comparePassword     as jest.Mock

const verifiedUser = {
  id:           "user-1",
  email:        "user@example.com",
  passwordHash: "hash",
  isVerified:   true,
  tokenVersion: 0,
}

const session = { id: "session-1", familyId: "family-1", refreshCounter: 0 }

beforeEach(() => jest.clearAllMocks())

describe("loginUser", () => {
  it("throws Invalid credentials when user not found", async () => {
    mockUser.findUnique.mockResolvedValue(null)
    await expect(loginUser({ email: "x@x.com", password: "pass" }))
      .rejects.toThrow("Invalid credentials")
  })

  it("throws Invalid credentials on wrong password", async () => {
    mockUser.findUnique.mockResolvedValue(verifiedUser as any)
    mockCompare.mockResolvedValue(false)
    await expect(loginUser({ email: "user@example.com", password: "wrong" }))
      .rejects.toThrow("Invalid credentials")
  })

  it("throws when user is not verified", async () => {
    mockUser.findUnique.mockResolvedValue({ ...verifiedUser, isVerified: false } as any)
    mockCompare.mockResolvedValue(true)
    await expect(loginUser({ email: "user@example.com", password: "pass" }))
      .rejects.toThrow("Email not verified")
  })

  it("returns accessToken and refreshToken on success", async () => {
    mockUser.findUnique.mockResolvedValue(verifiedUser as any)
    mockCompare.mockResolvedValue(true)
    mockSession.create.mockResolvedValue(session as any)
    mockRefreshToken.create.mockResolvedValue({} as any)

    const result = await loginUser({ email: "user@example.com", password: "pass" })

    expect(result).toHaveProperty("accessToken")
    expect(result).toHaveProperty("refreshToken")
    expect(typeof result.accessToken).toBe("string")
    expect(typeof result.refreshToken).toBe("string")
  })

  it("encodes the correct userId in the access token", async () => {
    mockUser.findUnique.mockResolvedValue(verifiedUser as any)
    mockCompare.mockResolvedValue(true)
    mockSession.create.mockResolvedValue(session as any)
    mockRefreshToken.create.mockResolvedValue({} as any)

    const { accessToken } = await loginUser({ email: "user@example.com", password: "pass" })

    const { verifyAccessToken } = require("../../../infrastructure/jwt")
    const decoded = verifyAccessToken(accessToken)
    expect(decoded.userId).toBe("user-1")
    expect(decoded.email).toBe("user@example.com")
  })
})
