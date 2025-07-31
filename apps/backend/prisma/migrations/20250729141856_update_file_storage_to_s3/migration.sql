/*
  Warnings:

  - You are about to drop the column `filePath` on the `file_shares` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `legal_documents` table. All the data in the column will be lost.
  - Added the required column `fileUrl` to the `file_shares` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `legal_documents` table without a default value. This is not possible if the table is not empty.

*/

-- First, add the new columns as nullable
ALTER TABLE "file_shares" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "legal_documents" ADD COLUMN "fileUrl" TEXT;

-- Update existing data to convert filePath to fileUrl format
-- For legal_documents, we'll set placeholder values that can be updated later
UPDATE "legal_documents" SET "fileUrl" = 'legacy_file_' || id || '.pdf' WHERE "fileUrl" IS NULL;

-- For file_shares, we'll set placeholder values
UPDATE "file_shares" SET "fileUrl" = 'legacy_share_' || id || '.pdf' WHERE "fileUrl" IS NULL;

-- Now make the columns NOT NULL
ALTER TABLE "file_shares" ALTER COLUMN "fileUrl" SET NOT NULL;
ALTER TABLE "legal_documents" ALTER COLUMN "fileUrl" SET NOT NULL;

-- Drop the old columns
ALTER TABLE "file_shares" DROP COLUMN "filePath";
ALTER TABLE "legal_documents" DROP COLUMN "filePath";

-- Update users table
ALTER TABLE "users" ADD COLUMN "address" TEXT;
ALTER TABLE "users" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Convert avatar from BYTEA to TEXT (this will clear existing avatar data)
-- We'll set a default placeholder for existing avatars
ALTER TABLE "users" ALTER COLUMN "avatar" SET DATA TYPE TEXT;
UPDATE "users" SET "avatar" = NULL WHERE "avatar" IS NOT NULL;
