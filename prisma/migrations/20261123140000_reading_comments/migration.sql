ALTER TABLE "Club" ADD COLUMN "readingId" UUID;
UPDATE "Club" SET "readingId" = gen_random_uuid() WHERE "bookVolumeId" IS NOT NULL;
ALTER TABLE "ClubMember" ADD COLUMN "avatarUrl" TEXT;

CREATE TABLE "ReadingComment" (
  "id" UUID NOT NULL,
  "clubId" UUID NOT NULL REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "readingId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "page" INTEGER NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReadingComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReadingComment_clubId_readingId_page_createdAt_id_idx"
  ON "ReadingComment"("clubId", "readingId", "page", "createdAt", "id");
