import { rotateRefreshToken } from "../../../application/auth/RotateRefreshToken"
import { generateRefreshToken } from "../../../infrastructure/jwt"

jest.mock("../../../infrastructure/prisma", () => ({
  prisma: {
    refreshToken: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    session:      { update: jest.fn() },
  },
}))

jest.mock("../../../infrastructure/audit/auditLogger", () => ({
  logAuditEvent: jest.fn(),
}))

import { prisma } from "../../../infrastructure/prisma"
const mockRT      = prisma.refreshToken as jest.Mocked<typeof prisma.refreshToken>
const mockSession = prisma.session      as jest.Mocked<typeof prisma.session>

// A valid refresh token signed with the test secret (set in jest.setup.ts)
const makeToken = (overrides: object = {}) =>
  generateRefreshToken({
    userId:       "user-1",
    sessionId:    "session-1",
    familyId:     "family-1",
    counter:      0,
    tokenVersion: 0,
    ...overrides,
  })

const makeDbRecord = (tokenStr: string, overrides: object = {}) => ({
  id:        "rt-1",
  token:     tokenStr,
  sessionId: "session-1",
  used:      false,
  session: {
    id:             "session-1",
    userId:         "user-1",
    familyId:       "family-1",
    revoked:        false,
    refreshCounter: 0,
    user: {
      id:           "user-1",
      email:        "user@example.com",
      tokenVersion: 0,
    },
    ...overrides,
  },
})

beforeEach(() => jest.clearAllMocks())

describe("rotateRefreshToken", () => {
  it("throws when the JWT signature is invalid", async () => {
    await expect(rotateRefreshToken("not.a.valid.token"))
      .rejects.toThrow("invalid or expired")
  })

  it("throws when the token is not in the database", async () => {
    const token = makeToken()
    mockRT.findUnique.mockResolvedValue(null)
    await expect(rotateRefreshToken(token)).rejects.toThrow("not found")
  })

  it("revokes the session and throws on token reuse", async () => {
    const token = makeToken()
    mockRT.findUnique.mockResolvedValue({ ...makeDbRecord(token), used: true } as any)
    mockSession.update.mockResolvedValue({} as any)

    await expect(rotateRefreshToken(token)).rejects.toThrow("already used")
    expect(mockSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revoked: true } })
    )
  })

  it("throws when the session is already revoked", async () => {
    const token = makeToken()
    mockRT.findUnique.mockResolvedValue(
      makeDbRecord(token, { revoked: true }) as any
    )
    await expect(rotateRefreshToken(token)).rejects.toThrow("revoked")
  })

  it("revokes the session and throws on tokenVersion mismatch", async () => {
    // Token was issued with tokenVersion 0 but user is now at version 1
    const token = makeToken({ tokenVersion: 0 })
    const record = makeDbRecord(token)
    record.session.user.tokenVersion = 1
    mockRT.findUnique.mockResolvedValue(record as any)
    mockSession.update.mockResolvedValue({} as any)

    await expect(rotateRefreshToken(token)).rejects.toThrow("Token has been revoked")
    expect(mockSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revoked: true } })
    )
  })

  it("returns new accessToken and refreshToken on success", async () => {
    const token = makeToken()
    mockRT.findUnique.mockResolvedValue(makeDbRecord(token) as any)
    mockRT.update.mockResolvedValue({} as any)
    mockRT.create.mockResolvedValue({} as any)
    mockSession.update.mockResolvedValue({ id: "session-1", refreshCounter: 1 } as any)

    const result = await rotateRefreshToken(token)

    expect(result).toHaveProperty("accessToken")
    expect(result).toHaveProperty("refreshToken")
    expect(result.refreshToken).not.toBe(token)
  })

  it("marks the old token as used before issuing a new one", async () => {
    const token = makeToken()
    mockRT.findUnique.mockResolvedValue(makeDbRecord(token) as any)
    mockRT.update.mockResolvedValue({} as any)
    mockRT.create.mockResolvedValue({} as any)
    mockSession.update.mockResolvedValue({ id: "session-1", refreshCounter: 1 } as any)

    await rotateRefreshToken(token)

    expect(mockRT.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { used: true } })
    )
  })
})
