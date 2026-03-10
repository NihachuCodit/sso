export interface RefreshTokenRepository {
  findByToken(token: string): Promise<any | null>
  revoke(token: string): Promise<void>
  create(token: string, userId: string, sessionId: string, expiresAt: Date): Promise<void>
}