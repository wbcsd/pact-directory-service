import jwt from "jsonwebtoken";
import HttpStatusCodes from "@src/common/HttpStatusCodes";
import { IReq, IRes } from "./common/types";
import { db } from "../database/db";

async function token(req: IReq, res: IRes) {
  const { client_id, client_secret, network_id } = req.body;

  // 1. Load both companies from the db. One company through the client_id and the other through the network_id
  const clientCompany = await db
    .selectFrom("companies")
    .leftJoin("users", "companies.id", "users.companyId")
    .select([
      "companies.id",
      "companies.clientSecret",
      "companies.networkId",
      "companies.companyName",
      "users.email",
    ])
    .where("clientId", "=", client_id as string)
    .executeTakeFirst();

  const networkCompany = await db
    .selectFrom("companies")
    .selectAll()
    .where("networkId", "=", network_id as string)
    .executeTakeFirst();

  // Check if both companies exist
  if (!clientCompany || !networkCompany) {
    res
      .status(HttpStatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid client_id or network_id" });

    return;
  }

  // 2. Check if the client_id and client_secret match the company
  if (clientCompany.clientSecret !== client_secret) {
    res
      .status(HttpStatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid client_secret" });

    return;
  }

  // 3. Check if a connection exists between them
  const connection = await db
    .selectFrom("connections")
    .selectAll()
    .where((qb) =>
      qb("connectedCompanyOneId", "=", clientCompany.id).or(
        "connectedCompanyTwoId",
        "=",
        clientCompany.id
      )
    )
    .where((qb) =>
      qb("connectedCompanyOneId", "=", networkCompany.id).or(
        "connectedCompanyTwoId",
        "=",
        networkCompany.id
      )
    )
    .executeTakeFirst();

  if (!connection) {
    res
      .status(HttpStatusCodes.UNAUTHORIZED)
      .json({ message: "No connection between the companies" });

    return;
  }

  // 4. If they do, generate a JWT signed with the secret being the one from the company which network_id = body param network_id and return it
  const token = jwt.sign(
    {
      iss: "https://im.carbon-transparency.org",
      sub: clientCompany.networkId.toString(),
      aud: networkCompany.networkId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
      iat: Math.floor(Date.now() / 1000),
      name: clientCompany.companyName,
      email: clientCompany.email,
    },
    networkCompany.clientSecret // Use the secret from the network company
  );

  res
    .status(HttpStatusCodes.OK)
    .json({ access_token: token, token_type: "Bearer" });
}

export default {
  token,
};
