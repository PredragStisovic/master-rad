-- CreateIndex
CREATE INDEX "tasks_project_id_id_idx" ON "tasks"("project_id", "id");

-- CreateIndex
CREATE INDEX "tasks_project_id_status_id_idx" ON "tasks"("project_id", "status", "id");

-- CreateIndex
CREATE INDEX "tasks_project_id_assignee_id_id_idx" ON "tasks"("project_id", "assignee_id", "id");
