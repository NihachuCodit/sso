import jwt from "jsonwebtoken"
import { jwtConfig } from "./jwtConfig"

export interface AccessTokenPayload {
  userId: string
  email: string
  tokenVersion?: number
  sessionId?: string
}

export function generateAccessToken(payload: any) {
  return jwt.sign(
    payload,
    jwtConfig.secret,
    {
      expiresIn: "1h"
    }
  )
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(
    token,
    jwtConfig.secret as string
  ) as any

  if (decoded.type !== "access") {
    throw new Error("Invalid token type")
  }

  return decoded
}