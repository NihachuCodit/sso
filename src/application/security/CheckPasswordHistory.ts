import { comparePassword } from "../../shared/hash"

export async function checkPasswordHistory(
  password: string,
  history: any[]
) {
  for (const entry of history) {
    const reused = await comparePassword(
      password,
      entry.passwordHash
    )

    if (reused) {
      throw new Error("Password was used before")
    }
  }
}