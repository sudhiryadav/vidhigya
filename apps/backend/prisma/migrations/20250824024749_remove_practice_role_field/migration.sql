/*
  Warnings:

  - You are about to drop the column `role` on the `practice_members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."practice_members" DROP COLUMN "role";

-- DropEnum
DROP TYPE "public"."PracticeRole";
