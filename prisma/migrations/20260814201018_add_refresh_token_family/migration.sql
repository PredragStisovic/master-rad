-- AlterTable: `rotated_at` records when a token was exchanged during rotation.
ALTER TABLE "RefreshToken" ADD COLUMN "rotated_at" TIMESTAMP(3);

-- AlterTable: `family_id` groups every token descended from a single login, so a
-- replayed token can invalidate the whole chain. Added nullable, backfilled, then
-- constrained, because the table is not empty.
ALTER TABLE "RefreshToken" ADD COLUMN "family_id" TEXT;

-- Backfill: each pre-existing token becomes the root of its own family, so an
-- older token can never take an unrelated session down with it.
UPDATE "RefreshToken" SET "family_id" = gen_random_uuid()::text WHERE "family_id" IS NULL;

ALTER TABLE "RefreshToken" ALTER COLUMN "family_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "RefreshToken_token_hash_family_id_idx" ON "RefreshToken"("token_hash", "family_id");
