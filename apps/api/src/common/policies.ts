import { UserContext } from '../services/user-service';
import { ForbiddenError } from './errors';

const POLICIES: Map<Role, string[]> = new Map<Role, string[]>();

export enum Role {
  ADMINISTRATOR = 'administrator',
  USER = 'user',
  ROOT = 'root',
}

/**
 * Registers a new policy by adding it to the global policies list.
 */
export function registerPolicy(role: Role, policy: string) {
  if (!POLICIES.has(role)) {
    POLICIES.set(role, []);
  }
  const policies = POLICIES.get(role);
  if (policies && !policies.includes(policy)) {
    policies.push(policy);
  }
}

/**
 * Lists all registered policies.
 */
export function getPoliciesForRole(role: Role): string[] {
  return POLICIES.get(role) ?? [];
}

/**
 * Checks whether the user has access based on the provided policy or policies and an optional condition.
 *
 * Throws a `ForbiddenError` if the user does not have the required policy or if the condition is not met.
 *
 * @param context - The user context containing the user's policies.
 * @param policy - A single policy or an array of policies to check against the user's policies.
 * @param condition - An optional boolean condition that must be true for access to be granted. Defaults to `true`.
 * @throws {ForbiddenError} If access is denied due to missing policy or failed condition.
 */
export function checkAccess(
  context: UserContext,
  policy: string | string[],
  condition = true
) {
  if (Array.isArray(policy)) {
    if (
      policy.length > 0 &&
      !policy.some((p) => context.policies.includes(p))
    ) {
      throw new ForbiddenError('Access denied');
    }
  } else {
    if (!context.policies.includes(policy)) {
      throw new ForbiddenError('Access denied');
    }
  }
  if (!condition) {
    throw new ForbiddenError('Access denied');
  }
}

// Check if the user context has the required role.
// Throws ForbiddenError if not.
export function requireRole(context: UserContext, role: Role) {
  if (context.role !== role) {
    throw new ForbiddenError('Access denied');
  }
}
