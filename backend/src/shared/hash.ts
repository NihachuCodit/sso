import { hash, compare } from 'bcrypt'
import { createHash } from 'crypto'

export const hashPassword   = (pwd: string)                  => hash(pwd, 10)
export const comparePassword = (pwd: string, hashStr: string) => compare(pwd, hashStr)

export const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex")