import bcrypt from "bcrypt";
import { db } from "@src/database/db";

async function main() {
  const [
    ,,
    email,
    fullName,
    password,
    companyIdentifier,
    companyName
  ] = process.argv;

  if (!email || !fullName || !password || !companyIdentifier || !companyName) {
    console.error(
      "Usage: ts-node add-user.ts <email> <fullName> <password> <companyIdentifier> <companyName>"
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
          registrationCode: "",
          clientId: "",
          clientSecret: "",
          networkKey: "",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      company = inserted;
      console.log(`Created company: ${companyName}`);
    } else {
      console.log(`Company already exists: ${companyName}`);
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
        companyId: company.id,
      })
      .executeTakeFirstOrThrow();

    console.log(`User ${email} added to company ${companyName}.`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();