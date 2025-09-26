import { Kysely } from 'kysely';
import jwt from 'jsonwebtoken';
import { Database } from '../database/types';
import { UnauthorizedError } from '@src/common/errors';

export interface RegisterData {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  organization_id: string;
}

export interface LoginData {
  client_id: string;
  client_secret: string;
  network_key: string;
}

export class AuthService {
  constructor(private db: Kysely<Database>) {}

  async token(data: LoginData) {
    const { client_id, client_secret, network_key } = data;

    // 1. Load both companies from the db. One company through the client_id and the other through the network_id
    const clientCompany = await this.db
        .selectFrom("organizations")
        .leftJoin("users", "organizations.id", "users.organizationId")
        .select([
        "organizations.id",
        "organizations.clientSecret",
        "organizations.networkKey",
        "organizations.name as companyName",
        "users.email",
        ])
        .where("clientId", "=", client_id)
        .executeTakeFirst();

    const networkCompany = await this.db
        .selectFrom("organizations")
        .selectAll()
        .where("networkKey", "=", network_key)
        .executeTakeFirst();

    // Check if both organizations exist
    if (!clientCompany || !networkCompany) {
      throw new UnauthorizedError('Invalid client_id or network_id');
    }

    // 2. Check if the client_id and client_secret match the organization
    if (clientCompany.clientSecret !== client_secret) {
      throw new UnauthorizedError('Invalid client_secret');
    }

    // 3. Check if a connection exists between them
    const connection = await this.db
      .selectFrom('connections')
      .selectAll()
      .where((qb) =>
        qb('connectedCompanyOneId', '=', clientCompany.id).or(
          'connectedCompanyTwoId',
          '=',
          clientCompany.id
        )
      )
      .where((qb) =>
        qb('connectedCompanyOneId', '=', networkCompany.id).or(
          'connectedCompanyTwoId',
          '=',
          networkCompany.id
        )
      )
      .executeTakeFirst();

    if (!connection) {
      throw new UnauthorizedError('No connection between the companies');
    }

    // 4. If they do, generate a JWT signed with the secret being the one from the company which network_id = body param network_id and return it
    const token = jwt.sign(
      {
        iss: 'https://im.carbon-transparency.org',
        sub: clientCompany.networkKey,
        aud: networkCompany.networkKey,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
        iat: Math.floor(Date.now() / 1000),
        name: clientCompany.companyName,
        email: clientCompany.email,
        },
        networkCompany.clientSecret ?? "" // Use the secret from the network company
    );
    return {
      access_token: token,
      token_type: 'Bearer',
    };
  }
}
