/*
  Warnings:

  - You are about to drop the column `deviceFingerprintHash` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `ipHash` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `userAgentHash` on the `Session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Session" DROP COLUMN "deviceFingerprintHash",
DROP COLUMN "ipHash",
DROP COLUMN "userAgentHash",
ADD COLUMN     "deviceInfo" JSONB;
