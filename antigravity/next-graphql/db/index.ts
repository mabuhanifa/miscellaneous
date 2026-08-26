import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log({ url, authToken });

if (!url) {
  throw new Error("TURSO_CONNECTION_URL is not defined");
}

const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });
