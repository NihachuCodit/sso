import { logoutAllDevices } from "../../../application/auth/LogoutAllDevices"

jest.mock("../../../infrastructure/prisma", () => ({
  prisma: {
    session: { updateMany: jest.fn() },
    user:    { update: jest.fn() },
  },
}))

jest.mock("../../../infrastructure/audit/auditLogger", () => ({
  logAuditEvent: jest.fn(),
}))

import { prisma } from "../../../infrastructure/prisma"
import { logAuditEvent } from "../../../infrastructure/audit/auditLogger"
const mockSession = prisma.session as jest.Mocked<typeof prisma.session>
const mockUser    = prisma.user    as jest.Mocked<typeof prisma.user>
const mockAudit   = logAuditEvent  as jest.Mock

beforeEach(() => jest.clearAllMocks())

describe("logoutAllDevices", () => {
  it("revokes all active sessions for the user", async () => {
    mockSession.updateMany.mockResolvedValue({ count: 3 } as any)
    mockUser.update.mockResolvedValue({} as any)

    await logoutAllDevices("user-1")

    expect(mockSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revoked: false },
      data:  { revoked: true },
    })
  })

  it("increments the user's tokenVersion", async () => {
    mockSession.updateMany.mockResolvedValue({ count: 1 } as any)
    mockUser.update.mockResolvedValue({} as any)

    await logoutAllDevices("user-1")

    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data:  { tokenVersion: { increment: 1 } },
    })
  })

  it("logs a LOGOUT_ALL audit event with session count", async () => {
    mockSession.updateMany.mockResolvedValue({ count: 2 } as any)
    mockUser.update.mockResolvedValue({} as any)

    await logoutAllDevices("user-1", { ip: "1.2.3.4", userAgent: "TestAgent" })

    expect(mockAudit).toHaveBeenCalledWith("LOGOUT_ALL", expect.objectContaining({
      userId:   "user-1",
      success:  true,
      ip:       "1.2.3.4",
      metadata: { sessionsRevoked: 2 },
    }))
  })

  it("works when there are no active sessions", async () => {
    mockSession.updateMany.mockResolvedValue({ count: 0 } as any)
    mockUser.update.mockResolvedValue({} as any)

    await expect(logoutAllDevices("user-1")).resolves.not.toThrow()
    expect(mockAudit).toHaveBeenCalledWith("LOGOUT_ALL", expect.objectContaining({
      metadata: { sessionsRevoked: 0 },
    }))
  })
})
