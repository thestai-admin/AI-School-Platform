-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION';
ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailVerifyToken" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerifyExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "User" ADD COLUMN "rejectionReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key" ON "User"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- Update existing users to ACTIVE status (they were already using the platform)
UPDATE "User" SET "status" = 'ACTIVE', "emailVerified" = NOW() WHERE "status" = 'PENDING_VERIFICATION';
