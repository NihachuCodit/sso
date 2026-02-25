import { hash, compare } from 'bcrypt'

export const hashPassword = (pwd: string) => hash(pwd, 10)
export const comparePassword = (pwd: string, hashStr: string) => compare(pwd, hashStr)