import { Request, Response, NextFunction } from "express"
import { verifyAccessToken, AccessTokenPayload } from "../jwt"
import { prisma } from "../prisma"

export interface AuthRequest extends Request {
  user?: AccessTokenPayload & { isAdmin: boolean }
}

// Write lastUsedAt at most once per session per this window to avoid a DB
// write on every single authenticated request.
const LAST_USED_THROTTLE_MS = 5 * 60 * 1000

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const token = authHeader.slice(7)

  let decoded: AccessTokenPayload
  try {
    decoded = verifyAccessToken(token)
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" })
  }

  // Verify tokenVersion + fetch isAdmin in one query; also check session status
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: decoded.userId },
      select: { tokenVersion: true, isAdmin: true, isLocked: true },
    }),
    decoded.sessionId
      ? prisma.session.findUnique({
          where:  { id: decoded.sessionId },
          select: { revoked: true, lastUsedAt: true },
        })
      : Promise.resolve(null),
  ])

  if (!user || decoded.tokenVersion !== user.tokenVersion) {
    return res.status(401).json({ error: "Token has been revoked" })
  }

  if (user.isLocked) {
    return res.status(403).json({ error: "Account has been locked by an administrator" })
  }

  if (session?.revoked) {
    return res.status(401).json({ error: "Session has been revoked" })
  }

  // Throttled lastUsedAt update — fire-and-forget, never blocks the request
  if (decoded.sessionId && session?.lastUsedAt) {
    const stale = Date.now() - new Date(session.lastUsedAt).getTime() > LAST_USED_THROTTLE_MS
    if (stale) {
      prisma.session.update({
        where: { id: decoded.sessionId },
        data:  { lastUsedAt: new Date() },
      }).catch(() => { /* non-critical */ })
    }
  }

  req.user = { ...decoded, isAdmin: user.isAdmin }
  next()
}
