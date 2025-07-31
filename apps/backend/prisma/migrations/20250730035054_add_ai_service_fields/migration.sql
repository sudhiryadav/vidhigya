-- AlterTable
ALTER TABLE "public"."legal_documents" ADD COLUMN     "aiChunks" INTEGER,
ADD COLUMN     "aiDocumentId" TEXT,
ADD COLUMN     "content" TEXT;
