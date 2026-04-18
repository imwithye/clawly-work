import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns } from "./base";

export const connectorTypeEnum = pgEnum("connector_type", ["netsuite"]);

export const connectors = pgTable("connectors", {
  ...baseColumns,
  name: text("name").notNull(),
  type: connectorTypeEnum("type").notNull(),
  accountId: text("account_id").notNull(),
  consumerKey: text("consumer_key").notNull(),
  consumerSecret: text("consumer_secret").notNull(),
  tokenId: text("token_id").notNull(),
  tokenSecret: text("token_secret").notNull(),
  baseUrl: text("base_url"),
});
