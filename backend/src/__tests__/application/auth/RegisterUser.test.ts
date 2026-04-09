import { registerUser } from "../../../application/auth/RegisterUser"

jest.mock("../../../infrastructure/prisma", () => ({
  prisma: {
    user:                { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    userPasswordHistory: { create: jest.fn() },
  },
}))

jest.mock("../../../infrastructure/audit/auditLogger", () => ({
  logAuditEvent: jest.fn(),
}))

jest.mock("../../../shared/hash", () => ({
  ...jest.requireActual("../../../shared/hash"),
  hashPassword: jest.fn().mockResolvedValue("hashed-password"),
}))

import { prisma } from "../../../infrastructure/prisma"
const mockUser    = prisma.user                as jest.Mocked<typeof prisma.user>
const mockHistory = prisma.userPasswordHistory as jest.Mocked<typeof prisma.userPasswordHistory>

const verifiedUser   = { id: "user-1", email: "new@example.com", isVerified: true  }
const unverifiedUser = { id: "user-1", email: "new@example.com", isVerified: false }

beforeEach(() => jest.clearAllMocks())

describe("registerUser", () => {
  it("throws when email is missing", async () => {
    await expect(registerUser({ email: "", password: "StrongPass99!" }))
      .rejects.toThrow("Email and password are required")
  })

  it("throws when password is missing", async () => {
    await expect(registerUser({ email: "a@b.com", password: "" }))
      .rejects.toThrow("Email and password are required")
  })

  it("throws on a weak password", async () => {
    await expect(registerUser({ email: "a@b.com", password: "password" }))
      .rejects.toThrow("Password too weak")
  })

  it("throws when the email belongs to a verified account", async () => {
    mockUser.findUnique.mockResolvedValue(verifiedUser as any)

    await expect(registerUser({ email: "new@example.com", password: "StrongPass99!" }))
      .rejects.toThrow("User already exists")

    expect(mockUser.create).not.toHaveBeenCalled()
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it("updates the password when re-registering an unverified account", async () => {
    mockUser.findUnique.mockResolvedValue(unverifiedUser as any)
    mockUser.update.mockResolvedValue(unverifiedUser as any)

    const result = await registerUser({ email: "new@example.com", password: "StrongPass99!" })

    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data:  { passwordHash: "hashed-password" },
    })
    expect(mockUser.create).not.toHaveBeenCalled()
    expect(result).toMatchObject({ id: "user-1" })
  })

  it("creates the user and saves password history on success", async () => {
    mockUser.findUnique.mockResolvedValue(null)
    mockUser.create.mockResolvedValue(unverifiedUser as any)
    mockHistory.create.mockResolvedValue({} as any)

    const result = await registerUser({ email: "new@example.com", password: "StrongPass99!" })

    expect(mockUser.create).toHaveBeenCalledWith({
      data: { email: "new@example.com", passwordHash: "hashed-password", isVerified: false },
    })
    expect(mockHistory.create).toHaveBeenCalledWith({
      data: { userId: "user-1", passwordHash: "hashed-password" },
    })
    expect(result).toMatchObject({ id: "user-1", email: "new@example.com" })
  })
})
