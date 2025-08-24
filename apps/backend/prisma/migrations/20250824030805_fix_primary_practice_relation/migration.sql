-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_primaryPracticeId_fkey";

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_primaryPracticeId_fkey" FOREIGN KEY ("primaryPracticeId") REFERENCES "public"."practices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
