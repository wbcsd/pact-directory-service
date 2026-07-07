import { UserContext } from '../services/user-service';
import { ForbiddenError } from './errors';

const POLICIES: Map<Role, string[]> = new Map<Role, string[]>();

export enum Role {
  Administrator = 'administrator',
  User = 'user',
  Root = 'root',
}

/**
 * Registers a new policy by adding it to the global policies list.
 */
export function registerPolicy(roles: Role[], policy: string) {
  roles.forEach((role) => {
    if (!POLICIES.has(role)) {
      POLICIES.set(role, []);
    }
    const policies = POLICIES.get(role);
    if (policies && !policies.includes(policy)) {
      policies.push(policy);
      POLICIES.set(role, policies);
    }
  });
}

/**
 * Lists all registered policies.
 */
export function getPoliciesForRole(role: Role): string[] {
  return POLICIES.get(role) ?? [];
}

/**
 * Checks if a user context has at least one of the required policy or policies.
 * 
 * @param context - The user context containing available policies
 * @param policy - A single policy string or array of policies check against
 * @returns True if the user has at least one of the required policies and the condition is met, false otherwise
 * 
 * @example
 * ```typescript
 * 
 * // Check single policy
 * hasAccess(userContext, 'read'); 
 * 
 * // Check multiple policies (user needs at least one)
 * hasAccess(userContext, ['read', 'admin']); // true
 * 
 * ```
 */
export function hasAccess(
  context: UserContext, 
  policy: string | string[],
): boolean {
  if (Array.isArray(policy)) {
    if (policy.length > 0 && !policy.some((p) => context.policies.includes(p))) {
      return false;
    }
  } else if (!context.policies.includes(policy)) {
      return false;
  }
  return true;
}

/**
 * Throws a `ForbiddenError` if the user does not have at least one of the required policies.
 *
 * @param context - The user context containing the user's policies.
 * @param policy - A single policy or an array of policies to check against the user's policies.
 * @throws {ForbiddenError} If access is denied due to missing policy or failed condition.
 */
export function checkAccess(
  context: UserContext,
  policy: string | string[]
) {
  if (!hasAccess(context, policy)) {
    throw new ForbiddenError('Access denied');
  }
}


