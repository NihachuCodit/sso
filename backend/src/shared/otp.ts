import { randomInt } from "crypto"

export const generateOtp = (): string => randomInt(100000, 1000000).toString()
