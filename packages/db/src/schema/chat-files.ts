import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { chats } from "./chats";

export const chatFiles = pgTable("chat_files", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
