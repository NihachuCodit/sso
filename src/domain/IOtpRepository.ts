export interface IOtpRepository {
  createOtp(userId: string, code: string, expiresAt: Date): Promise<void>
  validateOtp(userId: string, code: string): Promise<boolean>
}