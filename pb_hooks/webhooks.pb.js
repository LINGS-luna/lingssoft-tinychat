onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    
    // Only intercept user messages
    const messageType = record.get("message_type") || "user";
    if (messageType !== "user") {
        return;
    }

    try {
        const payload = {
            event: "create",
            collection: "messages",
            record: {
                id: record.id,
                text: record.get("text") || "",
                user_id: record.get("user_id") || "",
                room: record.get("room") || "general",
                message_type: messageType,
                processing_status: record.get("processing_status") || "pending",
                attachments: record.get("attachments") || [],
                document_id: record.get("document_id") || ""
            }
        };

        // Send POST webhook call to FastAPI AI engine
        $http.send({
            url: "http://fastapi-ai:8000/webhook/messages",
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json",
                "x-webhook-secret": $os.getenv("WEBHOOK_SECRET") || ""
            },
            timeout: 30
        });
    } catch (err) {
        console.log("Failed to send webhook to FastAPI: " + err);
    }
}, "messages");

onRecordAfterCreateSuccess((e) => {
    const record = e.record;

    try {
        const payload = {
            event: "create",
            collection: "documents",
            record: {
                id: record.id,
                title: record.get("title") || "",
                room: record.get("room") || "general",
                uploaded_by: record.get("uploaded_by") || "",
                processing_status: record.get("processing_status") || "pending",
                file: record.get("file") || "",
                chunk_count: record.get("chunk_count") || 0,
                last_error: record.get("last_error") || ""
            }
        };

        // Send POST webhook call to FastAPI AI engine for document processing
        $http.send({
            url: "http://fastapi-ai:8000/webhook/documents",
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json",
                "x-webhook-secret": $os.getenv("WEBHOOK_SECRET") || ""
            },
            timeout: 30
        });
    } catch (err) {
        console.log("Failed to send document webhook to FastAPI: " + err);
    }
}, "documents");
