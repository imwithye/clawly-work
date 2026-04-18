import { pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns } from "./base";

export const users = pgTable("users", {
  ...baseColumns,
  email: text("email").notNull().unique(),
  name: text("name"),
});
