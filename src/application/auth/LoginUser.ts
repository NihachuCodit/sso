import { Request, Response } from "express"
import { prisma } from "../../infrastructure/prisma"
import { compare } from "bcrypt"

import { generateAccessToken, generateRefreshToken } from "../../infrastructure/jwt/"

export default async function loginUser(req: Request, res: Response) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }

  if (!user.isVerified) {
    return res.status(403).json({ error: "User not verified" })
  }

  const isValid = await compare(password, user.passwordHash)

  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" })
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email
  })

  const refreshToken = generateRefreshToken({
    userId: user.id
  })

  if (!refreshToken) {
    throw new Error("Refresh token generation failed")
  }
  
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })

  return res.json({
    accessToken,
    refreshToken
  })
}