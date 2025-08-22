import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import logger from "@src/util/logger";
import EnvVars from "@src/common/EnvVars";
import HttpStatusCodes from "@src/common/HttpStatusCodes";
import { connectionRequestStatus } from "@src/common/types";
import { db } from "@src/database/db";
import { IReq, IRes } from "./common/types";
import { generateCredentials } from "@src/util/credentials";
import {
  sendConnectionRequestEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "@src/services/EmailService";
import { validate } from "@src/models/validation";
import { SignUpInputSchema } from "@src/models/SignUpInput";
import {
  createPasswordResetToken,
  validateResetToken,
  markTokenAsUsed,
} from "@src/util/password-reset";

/**
 *
 * Signup a company
 */

async function signup(req: IReq, res: IRes) {
  const validationResult = validate(req.body, SignUpInputSchema);

  if (!validationResult.success) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Invalid data, please review." });

    return;
  }

  const {
    companyName,
    companyIdentifier,
    companyIdentifierDescription,
    fullName,
    email,
    password,
    confirmPassword,
    solutionApiUrl,
  } = validationResult.value;

  // Check if passwords match
  if (password !== confirmPassword) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Passwords do not match" });

    return;
  }

  // Check if email already exists
  const emailExists = await db
    .selectFrom("users")
    .where("email", "=", email)
    .executeTakeFirst();

  if (emailExists) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Email already in use." });

    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { clientId, clientSecret, networkKey } = await generateCredentials();

  const user = await db.transaction().execute(async (trx) => {
    const company = await trx
      .insertInto("companies")
      .values({
        companyName,
        companyIdentifier,
        companyIdentifierDescription,
        solutionApiUrl,
        clientId,
        clientSecret,
        networkKey,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    return await trx
      .insertInto("users")
      .values({
        fullName: fullName,
        email: email,
        role: "user", // Default role
        password: hashedPassword,
        companyId: company.id,
      })
      .returning(["id", "email", "companyId", "role"])
      .executeTakeFirstOrThrow();
  });

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    },
    EnvVars.Jwt.Secret,
    {
      expiresIn: "6h",
    }
  );

  // Send welcome email
  await sendWelcomeEmail({
    to: email,
    name: fullName,
    companyName: companyName,
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
    .select(["password", "id", "email", "companyId", "role"])
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
    {
      userId: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    },
    EnvVars.Jwt.Secret,
    {
      expiresIn: "6h",
    }
  );

  res.status(HttpStatusCodes.OK).json({ token });
}

/**
 * My Profile
 */

async function myProfile(req: IReq, res: IRes) {
  const user = res.locals.user;
  const { email, companyId } = user as { email: string; companyId: string };

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
      "companies.networkKey",
      "companies.companyIdentifierDescription",
      "users.fullName",
      "users.email",
      "users.role",
    ])
    .where("users.email", "=", email)
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
      "companyIdentifierDescription",
      "networkKey",
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
  const user = res.locals.user;

  const { companyId: currentUserCompanyId } = user as { companyId: string };

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
      "users.email",
      "users.fullName",
    ])
    .where("companies.companyName", "ilike", `%${searchQuery as string}%`)
    .where("companies.id", "!=", Number(currentUserCompanyId))
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

  const requestingCompany = await db
    .selectFrom("companies")
    .selectAll()
    .where("id", "=", requestingCompanyId)
    .executeTakeFirst();

  const requestedCompany = await db
    .selectFrom("companies")
    .leftJoin("users", "companies.id", "users.companyId")
    .select(["users.email", "users.fullName"])
    .where("companies.id", "=", requestedCompanyId as number)
    .executeTakeFirst();

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
  if (
    requestedCompany &&
    requestingCompany &&
    requestedCompany.email &&
    requestedCompany.fullName
  ) {
    sendConnectionRequestEmail({
      to: requestedCompany.email,
      name: requestedCompany.fullName,
      companyName: requestingCompany.companyName,
    });
  }

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

/**
 * Forgot Password - Request password reset
 */
async function forgotPassword(req: IReq, res: IRes) {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Email is required" });
    return;
  }

  try {
    // Find user by email
    const user = await db
      .selectFrom("users")
      .innerJoin("companies", "users.companyId", "companies.id")
      .select(["users.id", "users.fullName", "users.email"])
      .where("users.email", "=", email.toLowerCase().trim())
      .executeTakeFirst();

    // Always return success to prevent email enumeration attacks
    if (!user) {
      res
        .status(HttpStatusCodes.OK)
        .json({ message: "If that email exists, a reset link has been sent." });
      return;
    }

    // Create password reset token
    const token = await createPasswordResetToken(user.id);

    // Generate reset URL
    const resetUrl = `${EnvVars.Frontend.Url}/reset-password/${token}`;

    // Send password reset email
    await sendPasswordResetEmail({
      to: user.email,
      name: user.fullName,
      resetUrl,
    });

    res
      .status(HttpStatusCodes.OK)
      .json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    logger.error("forgotPassword error", error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred. Please try again later." });
  }
}

/**
 * Reset Password - Reset password with token
 */
async function resetPassword(req: IReq, res: IRes) {
  const { token, password, confirmPassword } = req.body;

  if (
    !token ||
    typeof token !== "string" ||
    !password ||
    typeof password !== "string" ||
    !confirmPassword ||
    typeof confirmPassword !== "string"
  ) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Token, password, and confirm password are required" });
    return;
  }

  if (password !== confirmPassword) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Passwords do not match" });
    return;
  }

  if (password.length < 6) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Password must be at least 6 characters long" });
    return;
  }

  try {
    // Validate reset token
    const tokenValidation = await validateResetToken(token);

    if (!tokenValidation.isValid) {
      res
        .status(HttpStatusCodes.BAD_REQUEST)
        .json({ error: tokenValidation.error });
      return;
    }

    if (!tokenValidation.userId) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({ error: "Invalid token" });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await db
      .updateTable("users")
      .set({ password: hashedPassword })
      .where("id", "=", tokenValidation.userId)
      .execute();

    // Mark token as used
    await markTokenAsUsed(token);

    res
      .status(HttpStatusCodes.OK)
      .json({ message: "Password has been reset successfully" });
  } catch (error) {
    logger.error("resetPassword error", error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred. Please try again later." });
  }
}

/**
 * Verify Reset Token - Check if reset token is valid
 */
async function verifyResetToken(req: IReq, res: IRes) {
  const { token } = req.params;

  if (!token || typeof token !== "string") {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Token is required" });
    return;
  }

  try {
    const tokenValidation = await validateResetToken(token);

    if (!tokenValidation.isValid) {
      res
        .status(HttpStatusCodes.BAD_REQUEST)
        .json({ error: tokenValidation.error, valid: false });
      return;
    }

    res
      .status(HttpStatusCodes.OK)
      .json({ valid: true, message: "Token is valid" });
  } catch (error) {
    logger.error("verifyResetToken error", error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred. Please try again later." });
  }
}

export default {
  signup,
  login,
  myProfile,
  getCompany,
  searchCompanies,
  createConnectionRequest,
  connectionRequestAction,
  forgotPassword,
  resetPassword,
  verifyResetToken,
} as const;
