import { text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const baseColumns = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};
