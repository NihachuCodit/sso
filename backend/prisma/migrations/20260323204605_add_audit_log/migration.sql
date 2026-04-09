-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('USER_REGISTERED', 'USER_VERIFIED', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'OTP_REQUESTED', 'OTP_VERIFIED', 'OTP_FAILED', 'OTP_BRUTE_FORCE', 'TOKEN_REFRESHED', 'TOKEN_REUSE_DETECTED', 'ADMIN_USER_VERIFIED', 'ADMIN_USER_DELETED', 'ADMIN_USER_REVOKED', 'ADMIN_SESSION_REVOKED');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "eventType" "AuditEventType" NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_idx" ON "AuditLog"("eventType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");
