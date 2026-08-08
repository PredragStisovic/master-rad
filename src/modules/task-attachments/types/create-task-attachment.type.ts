/** The columns the service fills in for a `TaskAttachment` row. */
export type CreateTaskAttachmentType = {
  taskId: number;
  uploadedById: number;
  storageKey: string;
  filename: string;
  size: number;
  mimeType: string;
};
