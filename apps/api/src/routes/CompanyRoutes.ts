import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import EnvVars from "@src/common/EnvVars";
import HttpStatusCodes from "@src/common/HttpStatusCodes";
import { connectionRequestStatus } from "@src/common/types";
import { db } from "@src/database/db";
import { IReq, IRes } from "./common/types";
import { generateCredentials } from "@src/util/credentials";

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
    solutionApiUrl,
    registrationCode,
  } = req.body;

  // TODO: validations: email already exists, registration code is valid

  // Check if passwords match
  if (password !== confirmPassword) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Passwords do not match" });

    return void 0;
  }

  // Check if registration code is valid
  const registrationCodeExists = await db
    .selectFrom("registration_codes")
    .where("code", "=", registrationCode as string)
    .executeTakeFirst();

  if (!registrationCodeExists) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Invalid registration code" });

    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password as string, 10);

  // TODO: generate client_id and client_secret

  const { clientId, clientSecret, networkId } = await generateCredentials();

  // TODO do in transaction and rollback if user insert fails
  const company = await db
    .insertInto("companies")
    .values({
      // TODO casts will be removed when the input is typed and validated
      companyName: companyName as string,
      companyIdentifier: companyIdentifier as string,
      solutionApiUrl: solutionApiUrl as string,
      registrationCode: registrationCode as string,
      clientId,
      clientSecret,
      networkId,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  // Insert into users table
  const user = await db
    .insertInto("users")
    .values({
      fullName: fullName as string,
      email: email as string,
      password: hashedPassword,
      companyId: company.id,
    })
    .returning(["id as userId", "email", "companyId"])
    .executeTakeFirstOrThrow();

  const token = jwt.sign(user, EnvVars.Jwt.Secret, {
    expiresIn: "6h", // Token expiration time
  });

  res.status(HttpStatusCodes.CREATED).json({ token });
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
      expiresIn: "6h", // Token expiration time
    }
  );

  res.status(HttpStatusCodes.OK).json({ token });
}

/**
 * My Profile
 */

async function myProfile(req: IReq, res: IRes) {
  const user = res.locals.user;

  const { companyId } = user as { companyId: string };

  const company = await db
    .selectFrom("companies")
    .innerJoin("users", "companies.id", "users.companyId")
    .select([
      "companies.id",
      "companies.companyName",
      "companies.companyIdentifier",
      "companies.solutionApiUrl",
      "companies.clientId",
      "companies.clientSecret",
      "companies.networkId",
      "users.fullName",
      "users.email",
    ])
    .where("companies.id", "=", Number(companyId))
    .executeTakeFirst();

  // Connection requests
  const sentConnectionRequests = await db
    .selectFrom("connection_requests")
    .innerJoin(
      "companies",
      "connection_requests.requestedCompanyId",
      "companies.id"
    )
    .select([
      "createdAt",
      "status",
      "companies.companyName",
      "requestedCompanyId as companyId",
    ])
    .where("requestingCompanyId", "=", Number(companyId))

    .execute();

  const receivedConnectionRequests = await db
    .selectFrom("connection_requests")
    .innerJoin(
      "companies",
      "connection_requests.requestingCompanyId",
      "companies.id"
    )
    .select([
      "connection_requests.id",
      "createdAt",
      "status",
      "companies.companyName",
      "requestingCompanyId as companyId",
    ])
    .where("requestedCompanyId", "=", Number(companyId))
    .execute();

  // connections
  const connections = await db
    .selectFrom("connections")
    .innerJoin(
      "companies as companiesOne",
      "connections.connectedCompanyOneId",
      "companiesOne.id"
    )
    .innerJoin(
      "companies as companiesTwo",
      "connections.connectedCompanyTwoId",
      "companiesTwo.id"
    )
    .select([
      "connectedCompanyOneId",
      "connectedCompanyTwoId",
      "connections.requestedAt",
      "connections.createdAt",
      "companiesOne.companyName as companyOneName",
      "companiesTwo.companyName as companyTwoName",
    ])
    .where((qb) =>
      qb("connectedCompanyOneId", "=", Number(companyId)).or(
        "connectedCompanyTwoId",
        "=",
        Number(companyId)
      )
    )
    .execute();

  const connectedCompanies = connections.map((connection) => {
    if (connection.connectedCompanyOneId === Number(companyId)) {
      return {
        companyId: connection.connectedCompanyTwoId,
        companyName: connection.companyTwoName,
        requestedAt: connection.requestedAt,
        createdAt: connection.createdAt,
      };
    }

    return {
      companyId: connection.connectedCompanyOneId,
      companyName: connection.companyOneName,
      requestedAt: connection.requestedAt,
      createdAt: connection.createdAt,
    };
  });

  if (!company) {
    res
      .status(HttpStatusCodes.NOT_FOUND)
      .json({ message: "Company not found" });
    return;
  }

  res.json({
    ...company,
    connectionRequests: {
      sent: sentConnectionRequests,
      received: receivedConnectionRequests,
    },
    connectedCompanies,
  });
}

/**
 * Get a company by ID
 */
async function getCompany(req: IReq, res: IRes) {
  const user = res.locals.user;

  const { companyId: currentUserCompanyId } = user as { companyId: string };

  const { id } = req.params;

  // TODO validate id with zod

  const company = await db
    .selectFrom("companies")
    .innerJoin("users", "companies.id", "users.companyId")
    .select([
      "companies.id",
      "companyName",
      "companyIdentifier",
      "networkId",
      "solutionApiUrl",
      "users.fullName",
      "users.email",
    ])
    .where("companies.id", "=", Number(id))
    .executeTakeFirst();

  if (!company) {
    res
      .status(HttpStatusCodes.NOT_FOUND)
      .json({ message: "Company not found" });
    return;
  }

  // This is the connection request sent by the current user on behalf of
  // their company
  const sentConnectionRequest = await db
    .selectFrom("connection_requests")
    .select(["createdAt", "status"])
    .where("requestingCompanyId", "=", Number(currentUserCompanyId))
    .where("requestedCompanyId", "=", Number(id))
    .executeTakeFirst();

  // This is the connection request sent to the current user's company
  const receivedConnectionRequest = await db
    .selectFrom("connection_requests")
    .select(["createdAt", "status"])
    .where("requestingCompanyId", "=", Number(id))
    .where("requestedCompanyId", "=", Number(currentUserCompanyId))
    .executeTakeFirst();

  // Are they connected?
  const connection = await db
    .selectFrom("connections")
    .where((qb) =>
      qb("connectedCompanyOneId", "=", Number(currentUserCompanyId)).or(
        "connectedCompanyTwoId",
        "=",
        Number(currentUserCompanyId)
      )
    )
    .where((qb) =>
      qb("connectedCompanyOneId", "=", Number(id)).or(
        "connectedCompanyTwoId",
        "=",
        Number(id)
      )
    )
    .executeTakeFirst();

  res.json({
    company,
    sentConnectionRequest,
    receivedConnectionRequest,
    connectedToCurrentCompany: !!connection,
  });
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

  // TODO exclude own company from search results
  const companies = await db
    .selectFrom("companies")
    .innerJoin("users", "companies.id", "users.companyId")
    .select([
      "companies.id",
      "companies.companyName",
      "companies.companyIdentifier",
      "companies.solutionApiUrl",
      "companies.registrationCode",
      "users.email",
      "users.fullName",
    ])
    .where("companies.companyName", "ilike", `%${searchQuery as string}%`)
    .execute();

  res.json(companies);
}

/**
 * Create a connection request
 */
async function createConnectionRequest(req: IReq, res: IRes) {
  const user = res.locals.user;

  // TODO: validate these inputs with zod,
  // then there will be no need for castings below
  const requestingCompanyId = (user as { companyId: number }).companyId;
  const { companyId: requestedCompanyId } = req.body;

  if (!requestedCompanyId) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Requested company ID is required" });
    return;
  }

  if (requestingCompanyId === requestedCompanyId) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "You cannot connect with yourself" });
    return;
  }

  // TODO Validate connection request doesn't exist already

  const result = await db
    .insertInto("connection_requests")
    .values({
      requestingCompanyId: requestingCompanyId,
      requestedCompanyId: requestedCompanyId as number,
      status: connectionRequestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  // TODO: send email to requested company

  res.status(HttpStatusCodes.CREATED).json({ id: result.id });
}

/**
 * Handle connection request action
 */
async function connectionRequestAction(req: IReq, res: IRes) {
  const user = res.locals.user;
  const { companyId: currentCompanyId } = user as { companyId: number };
  const { requestId } = req.body;

  if (!requestId) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Request ID is required" });
    return;
  }

  // TODO reject flow
  const connectionRequest = await db
    .selectFrom("connection_requests")
    .selectAll()
    .where("id", "=", requestId as number)
    .executeTakeFirst();

  if (!connectionRequest) {
    res
      .status(HttpStatusCodes.NOT_FOUND)
      .json({ error: "Connection request not found" });
    return;
  }

  if (connectionRequest.requestedCompanyId !== currentCompanyId) {
    res
      .status(HttpStatusCodes.FORBIDDEN)
      .json({ error: "Only the requested company can accept the request" });
    return;
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("connections")
      .values({
        connectedCompanyOneId: connectionRequest.requestingCompanyId,
        connectedCompanyTwoId: connectionRequest.requestedCompanyId,
        createdAt: new Date(),
        requestedAt: connectionRequest.createdAt,
      })
      .execute();

    // TODO don't delete it, set it to accepted
    await trx
      .deleteFrom("connection_requests")
      .where("id", "=", requestId as number)
      .execute();
  });

  res
    .status(HttpStatusCodes.CREATED)
    .json({ message: "Connection created successfully" });
}

export default {
  signup,
  login,
  myProfile,
  getCompany,
  searchCompanies,
  createConnectionRequest,
  connectionRequestAction,
} as const;
