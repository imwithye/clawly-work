import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://clawly:clawly@localhost:5432/clawly";

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export * from "./schema";
export type Database = typeof db;
