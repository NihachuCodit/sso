import jwt from "jsonwebtoken"
import { jwtConfig } from "./jwtConfig"

export interface AccessTokenPayload {
  type: "access"
  userId: string
  email: string
  tokenVersion?: number
  sessionId?: string
}

export function generateAccessToken(
  payload: Omit<AccessTokenPayload, "type">
) {
  return jwt.sign(
    { ...payload, type: "access" },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessTokenExpiresIn as any }
  )
}

export function verifyAccessToken(
  token: string
): AccessTokenPayload {
  const decoded = jwt.verify(
    token,
    jwtConfig.accessSecret as string
  ) as AccessTokenPayload

  if (decoded.type !== "access") {
    throw new Error("Invalid token type")
  }

  return decoded
}