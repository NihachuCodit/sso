/*
  Warnings:

  - You are about to drop the `OtpAttempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OtpCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OtpAttempt" DROP CONSTRAINT "OtpAttempt_userId_fkey";

-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "used" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "OtpAttempt";

-- DropTable
DROP TABLE "OtpCode";

-- CreateIndex
CREATE INDEX "Otp_userId_idx" ON "Otp"("userId");

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
