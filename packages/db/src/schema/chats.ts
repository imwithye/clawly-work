import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const chats = pgTable("chats", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  title: text("title").notNull().default("New conversation"),
  workflowId: text("workflow_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
