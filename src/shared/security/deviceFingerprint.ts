import { createHash } from "crypto"

export function hashDeviceFingerprint(
  deviceFingerprint: string,
  ip?: string,
  userAgent?: string
) {
  return {
    deviceFingerprintHash: createHash("sha256")
      .update(deviceFingerprint)
      .digest("hex"),
    ipHash: ip ? createHash("sha256").update(ip).digest("hex") : undefined,
    userAgentHash: userAgent
      ? createHash("sha256").update(userAgent).digest("hex")
      : undefined
  }
}