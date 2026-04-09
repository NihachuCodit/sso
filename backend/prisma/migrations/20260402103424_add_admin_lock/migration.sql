-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_USER_LOCKED';
ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_USER_UNLOCKED';
ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_GRANT_ADMIN';
ALTER TYPE "AuditEventType" ADD VALUE 'ADMIN_REVOKE_ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
