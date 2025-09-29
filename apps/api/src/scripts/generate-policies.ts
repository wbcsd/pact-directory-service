import { db } from '@src/database/db';

async function execute() {
  const policies = [
    'org:list',
    'org:view',
    'org:write',
    'org:delete',
    'user:list',
    'user:view',
    'user:create',
    'user:delete',
    'text:list',
    'test:view',
    'test:create',
    'test:list',
  ];

  const roles = ['user', 'admin'];

  await db
    .insertInto('roles')
    .values(roles.map((role) => ({ name: role })))
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto('policies')
    .values(
      policies.map((policy) => ({
        name: policy,
        description: `Allows the user to ${policy.replace(':', ' ')}`,
      }))
    )
    .onConflict((oc) => oc.doNothing())
    .execute();
}

execute().catch((err: unknown) => {
  console.error('Error generating policies:', err);
  process.exit(1);
});
