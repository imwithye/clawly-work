import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { chats } from "./chats";

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
});
