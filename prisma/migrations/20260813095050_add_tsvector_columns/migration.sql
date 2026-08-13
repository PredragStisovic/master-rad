/*
  Warnings:

  - Added the required column `search` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `search` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "search";

ALTER TABLE "projects" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "search";

ALTER TABLE "tasks" ADD COLUMN "search" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', title), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- Full-text search indexes
CREATE INDEX "projects_search_idx" ON "projects" USING GIN ("search");
CREATE INDEX "tasks_search_idx" ON "tasks" USING GIN ("search");
