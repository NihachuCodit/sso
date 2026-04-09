/*
  Warnings:

  - You are about to drop the column `deviceFingerprint` on the `Session` table. All the data in the column will be lost.
  - Added the required column `deviceFingerprintHash` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" DROP COLUMN "deviceFingerprint",
ADD COLUMN     "deviceFingerprintHash" TEXT NOT NULL,
ADD COLUMN     "ipHash" TEXT,
ADD COLUMN     "userAgentHash" TEXT;
