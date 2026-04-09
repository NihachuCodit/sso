import { authMiddleware } from "../../infrastructure/middleware/authMiddleware"
import { generateAccessToken } from "../../infrastructure/jwt"

jest.mock("../../infrastructure/prisma", () => ({
  prisma: {
    user:    { findUnique: jest.fn() },
    session: { findUnique: jest.fn() },
  },
}))

import { prisma } from "../../infrastructure/prisma"
const mockUser    = prisma.user    as jest.Mocked<typeof prisma.user>
const mockSession = prisma.session as jest.Mocked<typeof prisma.session>

const makeToken = (overrides: object = {}) =>
  generateAccessToken({
    userId:       "user-1",
    email:        "user@example.com",
    tokenVersion: 0,
    sessionId:    "session-1",
    ...overrides,
  })

function mockReq(token?: string) {
  return {
    headers: { authorization: token ? `Bearer ${token}` : undefined },
  } as any
}

const mockRes = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json   = jest.fn().mockReturnValue(res)
  return res
}

beforeEach(() => jest.clearAllMocks())

describe("authMiddleware", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res  = mockRes()
    const next = jest.fn()
    await authMiddleware(mockReq(), res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 when the JWT is invalid", async () => {
    const res  = mockRes()
    const next = jest.fn()
    await authMiddleware(mockReq("not.a.token"), res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 when user is not found in DB", async () => {
    mockUser.findUnique.mockResolvedValue(null)
    mockSession.findUnique.mockResolvedValue({ revoked: false } as any)
    const res  = mockRes()
    const next = jest.fn()
    await authMiddleware(mockReq(makeToken()), res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Token has been revoked" })
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 when tokenVersion in token does not match DB", async () => {
    mockUser.findUnique.mockResolvedValue({ tokenVersion: 1 } as any) // user was reset
    mockSession.findUnique.mockResolvedValue({ revoked: false } as any)
    const res  = mockRes()
    const next = jest.fn()
    // Token has tokenVersion: 0, DB has 1
    await authMiddleware(mockReq(makeToken({ tokenVersion: 0 })), res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Token has been revoked" })
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 when session is revoked", async () => {
    mockUser.findUnique.mockResolvedValue({ tokenVersion: 0 } as any)
    mockSession.findUnique.mockResolvedValue({ revoked: true } as any)
    const res  = mockRes()
    const next = jest.fn()
    await authMiddleware(mockReq(makeToken()), res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Session has been revoked" })
    expect(next).not.toHaveBeenCalled()
  })

  it("calls next and attaches user on a valid token", async () => {
    mockUser.findUnique.mockResolvedValue({ tokenVersion: 0 } as any)
    mockSession.findUnique.mockResolvedValue({ revoked: false } as any)
    const req  = mockReq(makeToken())
    const res  = mockRes()
    const next = jest.fn()
    await authMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toMatchObject({ userId: "user-1", email: "user@example.com" })
  })

  it("skips session check when token has no sessionId", async () => {
    mockUser.findUnique.mockResolvedValue({ tokenVersion: 0 } as any)
    const req  = mockReq(generateAccessToken({ userId: "user-1", email: "u@x.com", tokenVersion: 0 }))
    const res  = mockRes()
    const next = jest.fn()
    await authMiddleware(req, res, next)
    expect(mockSession.findUnique).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it("returns 403 when the user account is locked", async () => {
    mockUser.findUnique.mockResolvedValue({ tokenVersion: 0, isAdmin: false, isLocked: true } as any)
    mockSession.findUnique.mockResolvedValue({ revoked: false, lastUsedAt: new Date() } as any)
    const res  = mockRes()
    const next = jest.fn()
    await authMiddleware(mockReq(makeToken()), res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: "Account has been locked by an administrator" })
    expect(next).not.toHaveBeenCalled()
  })

  it("fires a lastUsedAt update when the session is stale", async () => {
    const staleDate = new Date(Date.now() - 10 * 60 * 1000) // 10 min ago
    mockUser.findUnique.mockResolvedValue({ tokenVersion: 0, isAdmin: false, isLocked: false } as any)
    mockSession.findUnique.mockResolvedValue({ revoked: false, lastUsedAt: staleDate } as any)
    const mockUpdate = jest.fn().mockResolvedValue({})
    ;(prisma.session as any).update = mockUpdate

    const req  = mockReq(makeToken())
    const res  = mockRes()
    const next = jest.fn()
    await authMiddleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "session-1" } })
    )
  })
})
