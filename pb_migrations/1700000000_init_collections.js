migrate((app) => {
  // 1. messages
  try {
    app.findCollectionByNameOrId("messages");
  } catch (e) {
    const messages = new Collection({
      name: "messages",
      type: "base",
      fields: [
        { name: "id", type: "text", system: true },
        { name: "text", type: "text", required: true },
        { name: "user_id", type: "text", required: true },
        { name: "room", type: "text", required: true },
        {
          name: "message_type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["user", "bot", "system", "document_notice"]
        },
        {
          name: "processing_status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["pending", "queued", "processing", "completed", "failed", "ignored"]
        },
        { name: "document_id", type: "text", required: false },
        { name: "attachments", type: "json", required: false },
        { name: "metadata", type: "json", required: false }
      ]
    });
    app.saveNoValidate(messages);
  }

  // 2. documents
  try {
    app.findCollectionByNameOrId("documents");
  } catch (e) {
    const documents = new Collection({
      name: "documents",
      type: "base",
      fields: [
        { name: "id", type: "text", system: true },
        { name: "title", type: "text", required: true },
        { name: "room", type: "text", required: true },
        { name: "uploaded_by", type: "text", required: true },
        { name: "source_message", type: "text", required: false },
        {
          name: "processing_status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["pending", "queued", "processing", "completed", "failed"]
        },
        {
          name: "file",
          type: "file",
          required: true,
          maxSelect: 1,
          maxSize: 52428800
        },
        { name: "chunk_count", type: "number", required: false },
        { name: "last_error", type: "text", required: false },
        { name: "metadata", type: "json", required: false }
      ]
    });
    app.saveNoValidate(documents);
  }

  // 3. attachments
  try {
    app.findCollectionByNameOrId("attachments");
  } catch (e) {
    const attachments = new Collection({
      name: "attachments",
      type: "base",
      fields: [
        { name: "id", type: "text", system: true },
        { name: "message_id", type: "text", required: false },
        { name: "document_id", type: "text", required: false },
        {
          name: "file",
          type: "file",
          required: true,
          maxSelect: 1,
          maxSize: 52428800
        },
        { name: "file_name", type: "text", required: false },
        { name: "mime_type", type: "text", required: false },
        {
          name: "processing_status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["pending", "queued", "processing", "completed", "failed"]
        },
        { name: "metadata", type: "json", required: false }
      ]
    });
    app.saveNoValidate(attachments);
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("messages")); } catch (e) {}
  try { app.delete(app.findCollectionByNameOrId("documents")); } catch (e) {}
  try { app.delete(app.findCollectionByNameOrId("attachments")); } catch (e) {}
});
