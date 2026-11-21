ALTER TABLE "Club"
  ALTER COLUMN "bookVolumeId" DROP NOT NULL,
  ALTER COLUMN "bookTitle" DROP NOT NULL,
  ADD COLUMN "readingStartedAt" TIMESTAMP(3),
  ADD COLUMN "readingRevision" INTEGER NOT NULL DEFAULT 0,
  DROP CONSTRAINT "Club_has_reading_total";

UPDATE "Club" SET "readingStartedAt" = "createdAt";

ALTER TABLE "Club" ADD CONSTRAINT "Club_reading_consistent" CHECK (
  ("bookVolumeId" IS NOT NULL AND "bookTitle" IS NOT NULL AND "readingStartedAt" IS NOT NULL
    AND ("bookPages" IS NOT NULL OR "chapterTotal" IS NOT NULL))
  OR
  ("bookVolumeId" IS NULL AND "bookTitle" IS NULL AND "readingStartedAt" IS NULL
    AND "bookAuthors" IS NULL AND "bookPublisher" IS NULL AND "bookYear" IS NULL
    AND "bookIsbn" IS NULL AND "bookCover" IS NULL AND "bookPages" IS NULL AND "chapterTotal" IS NULL)
);
