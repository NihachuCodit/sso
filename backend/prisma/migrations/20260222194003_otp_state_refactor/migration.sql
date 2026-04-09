-- DropIndex
DROP INDEX "Otp_userId_idx";

-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
