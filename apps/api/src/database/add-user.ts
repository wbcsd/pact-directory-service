import bcrypt from "bcrypt";
import { db } from "@src/database/db";

async function main() {
  const [, , email, fullName, password, role, companyIdentifier, companyName] =
    process.argv;

  if (
    !email ||
    !fullName ||
    !password ||
    !role ||
    !companyIdentifier ||
    !companyName
  ) {
    console.error(
      "Usage: ts-node add-user.ts <email> <fullName> <password> <role> <companyIdentifier> <companyName>"
    );
    process.exit(1);
  }

  try {
    // Check if company exists
    let company = await db
      .selectFrom("companies")
      .selectAll()
      .where("companyIdentifier", "=", companyIdentifier)
      .executeTakeFirst();

    if (!company) {
      // Insert company
      const inserted = await db
        .insertInto("companies")
        .values({
          companyIdentifier,
          companyName,
          companyIdentifierDescription: "",
          solutionApiUrl: "",
          clientId: "",
          clientSecret: "",
          networkKey: "",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      company = inserted;
      console.info(`Created company: ${companyName}`);
    } else {
      console.info(`Company already exists: ${companyName}`);
    }

    // Check if user exists
    const userExists = await db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    if (userExists) {
      console.error("User with this email already exists.");
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await db
      .insertInto("users")
      .values({
        fullName,
        email,
        password: hashedPassword,
        role: role !== "administrator" ? "user" : role,
        companyId: company.id,
      })
      .executeTakeFirstOrThrow();

    console.info(`User ${email} added to company ${companyName}.`);
  } catch (error) {
    console.error("Error", error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
