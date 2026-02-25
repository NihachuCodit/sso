/*
  Warnings:

  - Added the required column `attempts` to the `OtpAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OtpAttempt" ADD COLUMN     "attempts" INTEGER NOT NULL;
