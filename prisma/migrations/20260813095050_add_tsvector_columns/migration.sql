-- AlterTable
ALTER TABLE "projects" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', title), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- Full-text search indexes
CREATE INDEX "projects_search_idx" ON "projects" USING GIN ("search");
CREATE INDEX "tasks_search_idx" ON "tasks" USING GIN ("search");
