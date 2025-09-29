import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {

  // Rename organizations table if not exists
  await db.schema
    .alterTable('companies')
    .renameTo('organizations')
    .execute();

  // Cannot chain renameColumn calls, so doing them one by one
  await db.schema.alterTable('organizations')
    .renameColumn('company_identifier', 'uri')
    .execute();
  await db.schema.alterTable('organizations')
    .renameColumn('company_name', 'name')
    .execute();
  await db.schema.alterTable('organizations')
    .renameColumn('company_identifier_description', 'description')
    .execute();

  // Add parent_id column to organizations
  await db.schema.alterTable('organizations')
    .addColumn('parent_id', 'integer')
    .execute();
  
  // Add foreign key constraint from organizations.parent_id to organizations.id
  await db.schema.alterTable('organizations')
    .addForeignKeyConstraint(
      'fk_organizations_parent_id',
      ['parent_id'],
      'organizations',
      ['id']
    )
    .execute();

  // Add index on parent_id
  await db.schema
    .createIndex('idx_organizations_parent_id')
    .on('organizations')
    .column('parent_id')
    .execute();

  // Rename company_id to organization_id in users table
  await db.schema.alterTable('users')
    .renameColumn('company_id', 'organization_id')
    .execute();

  // Create roles table if not exists
  await db.schema
    .createTable('roles')
    .ifNotExists()
    .addColumn('name', 'varchar(255)', (col) => col.primaryKey())
    .execute();

  await db.schema
    .createTable('policies')
    .ifNotExists()
    .addColumn('name', 'varchar(255)', (col) => col.primaryKey())
    .addColumn('description', 'text')
    .execute();

  await db.schema
    .createTable('roles_policies')
    .ifNotExists()
    .addColumn('role', 'varchar(255)', (col) => col.notNull())
    .addColumn('policy', 'varchar(255)', (col) => col.notNull())
    .addPrimaryKeyConstraint('role_policy_pk', ['role', 'policy'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropTable('role_policies')
    .ifExists()
    .execute();
  await db.schema
    .dropTable('policies')
    .ifExists()
    .execute();
  await db.schema
    .dropTable('roles')
    .ifExists()
    .execute();

  // Rename columns back to original names
  await db.schema.alterTable('users')
    .renameColumn('organization_id', 'company_id')
    .execute();

  // Drop parent_id column and its foreign key constraint
  // await db.schema.alterTable("organizations").dropConstraint("fk_organizations_parent").execute();
  await db.schema
    .alterTable('organizations')
    .dropColumn('parent_id')
    .execute();

  await db.schema
    .alterTable('organizations')
    .renameColumn('uri', 'company_identifier')
    .execute();
  await db.schema
    .alterTable('organizations')
    .renameColumn('name', 'company_name')
    .execute();
  await db.schema
    .alterTable('organizations')
    .renameColumn('description', 'company_identifier_description')
    .execute();

  await db.schema
    .alterTable('organizations')
    .renameTo('companies')
    .execute();
}
