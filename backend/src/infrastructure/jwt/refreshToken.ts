import jwt from "jsonwebtoken"
import { jwtConfig } from "./jwtConfig"

export interface RefreshTokenPayload {
  type: "refresh"
  userId: string
  sessionId: string
  familyId: string
  counter: number
  tokenVersion: number
}

export function generateRefreshToken(
  payload: Omit<RefreshTokenPayload, "type">
) {
  return jwt.sign(
    { ...payload, type: "refresh" },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshTokenExpiresIn as any }
  )
}

export function verifyRefreshToken(
  token: string
): RefreshTokenPayload {
  const decoded = jwt.verify(
    token,
    jwtConfig.refreshSecret
  ) as RefreshTokenPayload

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type")
  }

  return decoded
}