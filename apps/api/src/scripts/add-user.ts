import bcrypt from 'bcrypt';
import { db } from '@src/database/db';

async function main() {
  const [, , email, fullName, password, role, organizationUri, organizationName] = process.argv;

  if (
    !email ||
    !fullName ||
    !password ||
    !role ||
    !organizationUri ||
    !organizationName
  ) {
    console.error(
      'Usage: ts-node add-user.ts <email> <fullName> <password> <role> <organizationIdentifier> <organizationName>'
    );
    process.exit(1);
  }

  try {
    // Check if company exists
    let company = await db
      .selectFrom('organizations')
      .selectAll()
      .where('uri', '=', organizationUri)
      .executeTakeFirst();

    if (!company) {
      // Insert company
      const inserted = await db
        .insertInto('organizations')
        .values({
          uri: organizationUri,
          name: organizationName,
          description: '',
          solutionApiUrl: '',
          clientId: '',
          clientSecret: '',
          networkKey: '',
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      company = inserted;
      console.info(`Created company: ${organizationName}`);
    } else {
      console.info(`Company already exists: ${organizationName}`);
    }

    // Check if user exists
    const userExists = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();

    if (userExists) {
      console.error('User with this email already exists.');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await db
      .insertInto('users')
      .values({
        fullName,
        email,
        password: hashedPassword,
        role: role !== 'administrator' ? 'user' : role,
        organizationId: company.id,
      })
      .executeTakeFirstOrThrow();

    console.info(`User ${email} added to organization ${organizationName}.`);
  } catch (error) {
    console.error('Error', error);
     
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
