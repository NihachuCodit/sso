import jwt from "jsonwebtoken"
import { jwtConfig } from "./jwtConfig"

export function generateRefreshToken(payload: any) {
  if (!jwtConfig.secret) {
    throw new Error("JWT secret is not defined")
  }

  return jwt.sign(
    payload,
    jwtConfig.secret,
    {
      expiresIn: "7d"
    }
  )
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(
    token,
    jwtConfig.secret
  ) as any

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type")
  }

  return decoded
}