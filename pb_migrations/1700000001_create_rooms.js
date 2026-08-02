migrate((app) => {
  try {
    app.findCollectionByNameOrId("rooms");
  } catch (e) {
    const rooms = new Collection({
      name: "rooms",
      type: "base",
      indexes: ["CREATE UNIQUE INDEX `idx_rooms_name` ON `rooms` (`name`)"],
      fields: [
        { name: "id", type: "text", system: true },
        { name: "name", type: "text", required: true, min: 1 },
        { name: "system_prompt", type: "text", required: false }
      ]
    });
    app.saveNoValidate(rooms);
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("rooms")); } catch (e) {}
});
