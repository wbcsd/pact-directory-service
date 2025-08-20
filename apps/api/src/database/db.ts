import { Database } from "./types";
import { Pool } from "pg";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import EnvVars from "@src/common/EnvVars";

const dialect = new PostgresDialect({
  /*@typescript-eslint/no-unsafe-call */
  pool: new Pool({
    database: EnvVars.DirectoryDatabase.Database,
    host: EnvVars.DirectoryDatabase.Host,
    user: EnvVars.DirectoryDatabase.User,
    password: EnvVars.DirectoryDatabase.Password,
    port: 5432,
    max: 10,
    ssl: EnvVars.DirectoryDatabase.Ssl,
  }),
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
});
