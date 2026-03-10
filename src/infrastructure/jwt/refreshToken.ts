import jwt from "jsonwebtoken"
import { jwtConfig } from "./jwtConfig"

export interface RefreshTokenPayload {
  type: "refresh"
  userId: string
  sessionId: string
  familyId: string
  counter: number
}

export function generateRefreshToken(
  payload: Omit<RefreshTokenPayload, "type">
) {
  if (!jwtConfig.secret) {
    throw new Error("JWT secret is not defined")
  }

  return jwt.sign(
    {
      ...payload,
      type: "refresh"
    },
    jwtConfig.secret,
    {
      expiresIn: "7d"
    }
  )
}

export function verifyRefreshToken(
  token: string
): RefreshTokenPayload {
  const decoded = jwt.verify(
    token,
    jwtConfig.secret
  ) as RefreshTokenPayload

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type")
  }

  return decoded
}