import { Database } from './types';
import { Pool } from 'pg';
import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import config from '@src/common/config';

const dialect = new PostgresDialect({
  /*@typescript-eslint/no-unsafe-call */
  pool: new Pool({
    connectionString: config.DB_CONNECTION_STRING,
    max: 10,
  }),
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()],
});
