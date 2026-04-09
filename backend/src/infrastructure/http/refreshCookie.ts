import { Request, Response } from "express"

const COOKIE_NAME = "refresh_token"
const MAX_AGE_MS  = 7 * 24 * 60 * 60 * 1000

const cookieBase = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path:     "/",
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, { ...cookieBase, maxAge: MAX_AGE_MS })
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieBase)
}

export function getRefreshCookie(req: Request): string | undefined {
  return req.cookies?.[COOKIE_NAME]
}
