import { Database } from '@src/database/types';
import { Kysely } from 'kysely';

export class PolicyService {
  private userPolicies = new Map<number, string[]>();

  constructor(private db: Kysely<Database>) {}

  private async getPoliciesByUserId(userId: number): Promise<string[]> {
    const policies = await this.db
      .selectFrom('users')
      .innerJoin('roles_policies', 'users.role', 'roles_policies.role')
      .where('users.id', '=', userId)
      .select(['roles_policies.policy'])
      .execute();

    return policies.map((p: { policy: string }) => p.policy);
  }

  public async cachePolicies(userId: number) {
    this.invalidateCachedPolicies(userId);
    const policies = await this.getPoliciesByUserId(userId);
    this.userPolicies.set(userId, policies);
  }

  public async getCachedPolicies(userId: number): Promise<string[]> {
    if (!this.userPolicies.has(userId)) {
      await this.cachePolicies(userId);
    }

    // if there are no policies, it means the user has no policies assigned
    return this.userPolicies.get(userId) ?? [];
  }

  private invalidateCachedPolicies(userId: number) {
    this.userPolicies.delete(userId);
  }
}
