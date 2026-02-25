import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "secret"

export function generateAccessToken(payload: { userId: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h"
  })
}

export function generateRefreshToken(payload: { userId: string }) {
  return jwt.sign(
    {
      userId: payload.userId,
      type: "refresh"
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  )
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET) as any

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type")
  }

  return decoded
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET)
}