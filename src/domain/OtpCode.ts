export class OtpCode {
    constructor(
        public userId: string,
        public code: string,
        public expiresAt: Date
    ) { }

    isValid(inputCode: string): boolean {
        return this.code === inputCode && new Date() <= this.expiresAt
    }
}