/*
  Warnings:

  - You are about to drop the column `court` on the `legal_cases` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CourtType" AS ENUM ('SUPREME_COURT', 'HIGH_COURT', 'DISTRICT_COURT', 'SESSIONS_COURT', 'MAGISTRATE_COURT', 'FAMILY_COURT', 'LABOR_COURT', 'CONSUMER_COURT', 'TRIBUNAL', 'SPECIAL_COURT', 'OTHER');

-- AlterTable
ALTER TABLE "legal_cases" DROP COLUMN "court",
ADD COLUMN     "courtId" TEXT;

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CourtType" NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "jurisdiction" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
