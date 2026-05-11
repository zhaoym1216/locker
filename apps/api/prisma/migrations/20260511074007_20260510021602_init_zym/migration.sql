/*
  Warnings:

  - A unique constraint covering the columns `[invite_code]` on the table `circles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "circles" ADD COLUMN     "invite_code" VARCHAR(20),
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "verified_city" VARCHAR(100),
ADD COLUMN     "verified_email" VARCHAR(255);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "code" VARCHAR(6),
    "status" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verifications_user_id_type_value_key" ON "verifications"("user_id", "type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "circles_invite_code_key" ON "circles"("invite_code");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
