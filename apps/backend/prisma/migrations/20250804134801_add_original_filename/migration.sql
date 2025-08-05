-- AlterTable
ALTER TABLE "public"."document_versions" ADD COLUMN     "originalFilename" TEXT;

-- AlterTable
ALTER TABLE "public"."legal_documents" ADD COLUMN     "originalFilename" TEXT;
