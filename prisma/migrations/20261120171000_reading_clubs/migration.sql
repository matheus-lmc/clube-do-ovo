-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Club" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "leaderId" UUID NOT NULL,
    "inviteCode" VARCHAR(6) NOT NULL,
    "bookVolumeId" TEXT NOT NULL,
    "bookTitle" TEXT NOT NULL,
    "bookAuthors" TEXT,
    "bookPublisher" TEXT,
    "bookYear" TEXT,
    "bookIsbn" VARCHAR(13),
    "bookCover" TEXT,
    "bookPages" INTEGER,
    "chapterTotal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMember" (
    "clubId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "progress" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMember_pkey" PRIMARY KEY ("clubId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_inviteCode_key" ON "Club"("inviteCode");

-- CreateIndex
CREATE INDEX "ClubMember_userId_idx" ON "ClubMember"("userId");

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Club"
  ADD CONSTRAINT "Club_invite_format" CHECK ("inviteCode" ~ '^[A-Z0-9]{6}$'),
  ADD CONSTRAINT "Club_book_pages_positive" CHECK ("bookPages" IS NULL OR "bookPages" > 0),
  ADD CONSTRAINT "Club_chapter_total_positive" CHECK ("chapterTotal" IS NULL OR "chapterTotal" > 0),
  ADD CONSTRAINT "Club_has_reading_total" CHECK ("bookPages" IS NOT NULL OR "chapterTotal" IS NOT NULL);

ALTER TABLE "ClubMember"
  ADD CONSTRAINT "ClubMember_progress_nonnegative" CHECK ("progress" IS NULL OR "progress" >= 0);

-- Club data is accessed by the server connection after checking the Supabase session.
ALTER TABLE "Club" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubMember" ENABLE ROW LEVEL SECURITY;
