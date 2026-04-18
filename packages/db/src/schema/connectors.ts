import { jsonb, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns } from "./base";

export const connectorTypeEnum = pgEnum("connector_type", ["netsuite"]);

export const connectors = pgTable("connectors", {
  ...baseColumns,
  name: text("name").notNull(),
  type: connectorTypeEnum("type").notNull(),
  credentials: jsonb("credentials").notNull(),
});
