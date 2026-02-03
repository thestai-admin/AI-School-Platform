-- Add slug column to School table
ALTER TABLE "School" ADD COLUMN "slug" TEXT;

-- Add isActive column to School table
ALTER TABLE "School" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Generate slug from name for existing schools (lowercase, replace spaces with hyphens)
UPDATE "School" SET "slug" = LOWER(REPLACE(REPLACE("name", ' ', '-'), '.', '')) WHERE "slug" IS NULL;

-- Make slug required and unique after populating
ALTER TABLE "School" ALTER COLUMN "slug" SET NOT NULL;

-- Create unique index on slug
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- Create index for faster lookups
CREATE INDEX "School_slug_idx" ON "School"("slug");
