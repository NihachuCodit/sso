import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../infrastructure/jwt"

// Env vars are set in jest.setup.ts before this module loads

const accessPayload = {
  userId:       "user-1",
  email:        "user@example.com",
  tokenVersion: 0,
  sessionId:    "session-1",
}

const refreshPayload = {
  userId:       "user-1",
  sessionId:    "session-1",
  familyId:     "family-1",
  counter:      0,
  tokenVersion: 0,
}

// ─── Access tokens ────────────────────────────────────────────────────────────

describe("generateAccessToken / verifyAccessToken", () => {
  it("round-trips correctly", () => {
    const token = generateAccessToken(accessPayload)
    const decoded = verifyAccessToken(token)

    expect(decoded.userId).toBe(accessPayload.userId)
    expect(decoded.email).toBe(accessPayload.email)
    expect(decoded.tokenVersion).toBe(accessPayload.tokenVersion)
    expect(decoded.sessionId).toBe(accessPayload.sessionId)
    expect(decoded.type).toBe("access")
  })

  it("rejects a token signed with the wrong secret", () => {
    const jwt = require("jsonwebtoken")
    const bad = jwt.sign({ ...accessPayload, type: "access" }, "wrong-secret", { expiresIn: "1h" })
    expect(() => verifyAccessToken(bad)).toThrow()
  })

  it("rejects a refresh token passed to verifyAccessToken", () => {
    // Refresh token is signed with JWT_REFRESH_SECRET, so verification against
    // JWT_SECRET fails with 'invalid signature' — no type check needed
    const token = generateRefreshToken(refreshPayload)
    expect(() => verifyAccessToken(token)).toThrow()
  })

  it("rejects an expired token", () => {
    const jwt = require("jsonwebtoken")
    const expired = jwt.sign(
      { ...accessPayload, type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: "0s" }
    )
    expect(() => verifyAccessToken(expired)).toThrow()
  })
})

// ─── Refresh tokens ───────────────────────────────────────────────────────────

describe("generateRefreshToken / verifyRefreshToken", () => {
  it("round-trips correctly", () => {
    const token = generateRefreshToken(refreshPayload)
    const decoded = verifyRefreshToken(token)

    expect(decoded.userId).toBe(refreshPayload.userId)
    expect(decoded.sessionId).toBe(refreshPayload.sessionId)
    expect(decoded.familyId).toBe(refreshPayload.familyId)
    expect(decoded.counter).toBe(refreshPayload.counter)
    expect(decoded.tokenVersion).toBe(refreshPayload.tokenVersion)
    expect(decoded.type).toBe("refresh")
  })

  it("rejects a token signed with the wrong secret", () => {
    const jwt = require("jsonwebtoken")
    const bad = jwt.sign({ ...refreshPayload, type: "refresh" }, "wrong-secret", { expiresIn: "7d" })
    expect(() => verifyRefreshToken(bad)).toThrow()
  })

  it("rejects an access token passed to verifyRefreshToken", () => {
    // Access token is signed with JWT_SECRET, so verification against
    // JWT_REFRESH_SECRET fails with 'invalid signature' — no type check needed
    const token = generateAccessToken(accessPayload)
    expect(() => verifyRefreshToken(token)).toThrow()
  })

  it("uses a different secret than the access token (cross-verification fails)", () => {
    const jwt = require("jsonwebtoken")
    // A valid refresh token cannot be verified against the access secret
    const token = generateRefreshToken(refreshPayload)
    expect(() => jwt.verify(token, process.env.JWT_SECRET)).toThrow()
    // And vice versa
    const accessToken = generateAccessToken(accessPayload)
    expect(() => jwt.verify(accessToken, process.env.JWT_REFRESH_SECRET)).toThrow()
  })
})
