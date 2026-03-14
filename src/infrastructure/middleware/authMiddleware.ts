import { Request, Response, NextFunction } from "express"
import { verifyAccessToken, AccessTokenPayload } from "../jwt"

export interface AuthRequest extends Request {
  user?: AccessTokenPayload
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const token = authHeader.slice(7)

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}
