export function validateRefreshToken(storedToken: any) {

    if (!storedToken) {
      throw new Error("Invalid refresh token")
    }
  
    if (storedToken.revoked) {
      throw new Error("Refresh token revoked")
    }
  
    if (storedToken.expiresAt < new Date()) {
      throw new Error("Refresh token expired")
    }
  }