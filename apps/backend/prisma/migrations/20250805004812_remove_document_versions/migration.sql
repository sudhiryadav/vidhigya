/*
  Warnings:

  - You are about to drop the column `version` on the `legal_documents` table. All the data in the column will be lost.
  - You are about to drop the `document_versions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."document_versions" DROP CONSTRAINT "document_versions_documentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."document_versions" DROP CONSTRAINT "document_versions_uploadedById_fkey";

-- AlterTable
ALTER TABLE "public"."legal_documents" DROP COLUMN "version";

-- DropTable
DROP TABLE "public"."document_versions";
