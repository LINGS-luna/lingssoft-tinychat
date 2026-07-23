migrate((db) => {
  const dao = new Dao(db);

  try {
    dao.findCollectionByNameOrId("rooms");
  } catch (e) {
    const rooms = new Collection({
      name: "rooms",
      type: "base",
      schema: [
        { name: "name", type: "text", required: true, options: { min: 1 } },
        { name: "system_prompt", type: "text", required: false }
      ]
    });
    // Add unique index on name
    rooms.indexes = ["CREATE UNIQUE INDEX `idx_rooms_name` ON `rooms` (`name`)"];
    dao.saveCollection(rooms);
  }
}, (db) => {
  const dao = new Dao(db);
  try { dao.deleteCollection(dao.findCollectionByNameOrId("rooms")); } catch (e) {}
});
