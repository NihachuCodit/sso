import { logoutUser } from "../../../application/auth/LogoutUser"

jest.mock("../../../infrastructure/prisma", () => ({
  prisma: {
    refreshToken: { findUnique: jest.fn(), update: jest.fn() },
    session:      { update: jest.fn() },
  },
}))

jest.mock("../../../infrastructure/audit/auditLogger", () => ({
  logAuditEvent: jest.fn(),
}))

import { prisma } from "../../../infrastructure/prisma"
const mockRT      = prisma.refreshToken as jest.Mocked<typeof prisma.refreshToken>
const mockSession = prisma.session      as jest.Mocked<typeof prisma.session>

const tokenRecord = {
  id:        "rt-1",
  token:     "some-token",
  sessionId: "session-1",
  session:   { id: "session-1", userId: "user-1" },
}

beforeEach(() => jest.clearAllMocks())

describe("logoutUser", () => {
  it("throws when the refresh token is not found", async () => {
    mockRT.findUnique.mockResolvedValue(null)
    await expect(logoutUser("invalid-token")).rejects.toThrow("Token not found")
  })

  it("revokes the session", async () => {
    mockRT.findUnique.mockResolvedValue(tokenRecord as any)
    mockSession.update.mockResolvedValue({} as any)
    mockRT.update.mockResolvedValue({} as any)

    await logoutUser("some-token")

    expect(mockSession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data:  { revoked: true },
    })
  })

  it("marks the refresh token as used", async () => {
    mockRT.findUnique.mockResolvedValue(tokenRecord as any)
    mockSession.update.mockResolvedValue({} as any)
    mockRT.update.mockResolvedValue({} as any)

    await logoutUser("some-token")

    expect(mockRT.update).toHaveBeenCalledWith({
      where: { id: "rt-1" },
      data:  { used: true },
    })
  })

  it("logs the audit event", async () => {
    const { logAuditEvent } = require("../../../infrastructure/audit/auditLogger")
    mockRT.findUnique.mockResolvedValue(tokenRecord as any)
    mockSession.update.mockResolvedValue({} as any)
    mockRT.update.mockResolvedValue({} as any)

    await logoutUser("some-token", { ip: "1.2.3.4" })

    expect(logAuditEvent).toHaveBeenCalledWith("LOGOUT", expect.objectContaining({
      userId:    "user-1",
      sessionId: "session-1",
      success:   true,
      ip:        "1.2.3.4",
    }))
  })
})
