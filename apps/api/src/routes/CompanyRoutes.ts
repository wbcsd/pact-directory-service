import HttpStatusCodes from "@src/common/HttpStatusCodes";
import { IReq, IRes } from "./common/types";
import { db } from "../database/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import EnvVars from "@src/common/EnvVars";

/**
 *
 * Signup a company
 */

async function signup(req: IReq, res: IRes) {
  // TODO: validate input with zod
  const {
    companyName,
    companyIdentifier,
    fullName,
    email,
    password,
    confirmPassword,
    solutionApiProdUrl,
    solutionApiDevUrl,
    registrationCode,
  } = req.body;

  // Check if passwords match
  if (password !== confirmPassword) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Passwords do not match" });

    return void 0;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password as string, 10);

  // Insert into companies table
  // TODO do in transaction and rollback if user insert fails
  const company = await db
    .insertInto("companies")
    .values({
      // TODO casts will be removed when the input is typed and validated
      companyName: companyName as string,
      companyIdentifier: companyIdentifier as string,
      solutionApiProdUrl: solutionApiProdUrl as string,
      solutionApiDevUrl: solutionApiDevUrl as string,
      registrationCode: registrationCode as string,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  // Insert into users table
  await db
    .insertInto("users")
    .values({
      fullName: fullName as string,
      email: email as string,
      password: hashedPassword,
      companyId: company.id,
    })
    .execute();

  // TODO: generate client_id and client_secret

  res.status(HttpStatusCodes.CREATED).end();
}

/**
 * Login
 */

async function login(req: IReq, res: IRes) {
  const { email, password } = req.body;

  const user = await db
    .selectFrom("users")
    .select(["password", "id", "email", "companyId"])
    .where("email", "=", email as string)
    .executeTakeFirstOrThrow();

  const isPasswordValid = await bcrypt.compare(
    password as string,
    user.password
  );

  if (!isPasswordValid) {
    res
      .status(HttpStatusCodes.UNAUTHORIZED)
      .json({ error: "Invalid email or password" });

    return void 0;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, companyId: user.companyId },
    EnvVars.Jwt.Secret,
    {
      expiresIn: "1h", // Token expiration time
    }
  );

  res.status(HttpStatusCodes.OK).json({ token });
}

/**
 * My Profile
 */

async function myProfile(req: IReq, res: IRes) {
  // TODO move to middleware
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token missing or malformed" });
    return void 0;
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, EnvVars.Jwt.Secret);

  const user = decoded;

  const { companyId } = user as { companyId: string };

  const company = await db
    .selectFrom("companies")
    .select([
      "id",
      "companyName",
      "companyIdentifier",
      "solutionApiProdUrl",
      "solutionApiDevUrl",
    ])
    .where("id", "=", Number(companyId))
    .executeTakeFirst();

  if (!company) {
    res.status(404).json({ message: "Company not found" });
    return void 0;
  }

  res.json(company);
}

/**
 * Get a company by ID
 */
async function getCompany(req: IReq, res: IRes) {
  // TODO Add auth middleware

  const { id } = req.params;

  // TODO validate id with zod

  const company = await db
    .selectFrom("companies")
    .select([
      "id",
      "companyName",
      "companyIdentifier",
      "solutionApiProdUrl",
      "solutionApiDevUrl",
    ])
    .where("id", "=", Number(id))
    .executeTakeFirst();

  if (!company) {
    res
      .status(HttpStatusCodes.NOT_FOUND)
      .json({ message: "Company not found" });
    return;
  }

  res.json(company);
}

/**
 * Search companies by companyName
 */
async function searchCompanies(req: IReq, res: IRes) {
  // TODO validate with zod
  const { searchQuery } = req.query;

  if (!searchQuery) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "searchQuery is required" });
    return;
  }

  const companies = await db
    .selectFrom("companies")
    .innerJoin("users", "companies.id", "users.companyId")
    .select([
      "companies.id",
      "companies.companyName",
      "companies.companyIdentifier",
      "companies.solutionApiProdUrl",
      "companies.solutionApiDevUrl",
      "companies.registrationCode",
      "users.email",
    ])
    .where("companies.companyName", "ilike", `%${searchQuery as string}%`)
    .execute();

  res.json(companies);
}

export default {
  signup,
  login,
  myProfile,
  getCompany,
  searchCompanies,
} as const;
