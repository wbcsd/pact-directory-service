import { Database } from "./types";
import { Pool } from "pg";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";

const dialect = new PostgresDialect({
  /*@typescript-eslint/no-unsafe-call */
  pool: new Pool({
    database: "pact_directory_local",
    host: "localhost",
    user: "postgres",
    password: "postgres",
    port: 5432,
    max: 10,
  }),
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
});
