import { hashDeviceFingerprint } from "../../shared/security/deviceFingerprint"

export async function validateRefreshToken(
  storedToken: any,
  deviceFingerprint?: string
) {
  if (!storedToken) throw new Error("Invalid refresh token")
  if (storedToken.revoked) throw new Error("Refresh token revoked")
  if (storedToken.expiresAt < new Date()) throw new Error("Refresh token expired")

  if (deviceFingerprint && storedToken.session?.deviceInfo) {
    const info = JSON.parse(storedToken.session.deviceInfo)
    const { deviceFingerprintHash } = info

    if (
      deviceFingerprintHash &&
      deviceFingerprintHash !== (await hashDeviceFingerprint(deviceFingerprint))
    ) {
      throw new Error("Device mismatch")
    }
  }

  return storedToken
}