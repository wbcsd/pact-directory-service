import bcrypt from "bcrypt";
import { db } from "@src/database/db";
import logger from "@src/util/logger";

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
    logger.error(
      "Usage: ts-node add-user.ts <email> <fullName> <password> <role> <companyIdentifier> <companyName>"
    );
    // eslint-disable-next-line n/no-process-exit
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
      logger.info(`Created company: ${companyName}`);
    } else {
      logger.info(`Company already exists: ${companyName}`);
    }

    // Check if user exists
    const userExists = await db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    if (userExists) {
      logger.error("User with this email already exists.");
      // eslint-disable-next-line n/no-process-exit
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

    logger.info(`User ${email} added to company ${companyName}.`);
  } catch (err) {
    logger.error("Error:", err.message as any);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
