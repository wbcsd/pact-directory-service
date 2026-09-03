/**
 * Single source of truth for the authorization roles and access policies used by
 * the PACT Directory Service. Shared by the API and the directory portal so that
 * policy identifiers can never drift apart between backend and frontend.
 *
 * `Role` and `Policy` are each both a value (named constants, e.g.
 * `Policy.ViewAllLogs`) and a type (the union of every identifier), so plain
 * string literals such as `'view-all-logs'` remain valid but are now checked at
 * compile time and offered by autocomplete.
 */

export const Role = {
  Administrator: 'administrator',
  User: 'user',
  Root: 'root',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const Policy = {
  // Activity logs
  ViewAllLogs: 'view-all-logs',
  ViewOrgLogs: 'view-org-logs',

  // Footprints
  ManageFootprintsOwnOrganization: 'manage-footprints-own-organization',
  ManageFootprintsAllOrganizations: 'manage-footprints-all-organizations',

  // Node connections
  ManageConnectionsOwnNodes: 'manage-connections-own-nodes',
  ManageConnectionsAllNodes: 'manage-connections-all-nodes',

  // Nodes
  ViewNodesOwnOrganization: 'view-nodes-own-organization',
  EditNodesOwnOrganization: 'edit-nodes-own-organization',
  ViewNodesAllOrganizations: 'view-nodes-all-organizations',
  EditNodesAllOrganizations: 'edit-nodes-all-organizations',

  // Organizations
  ViewConnectionsOwnOrganization: 'view-connections-own-organization',
  EditConnectionsOwnOrganization: 'edit-connections-own-organization',
  ViewOwnOrganizations: 'view-own-organizations',
  EditOwnOrganizations: 'edit-own-organizations',
  ViewConnectionsAllOrganizations: 'view-connections-all-organizations',
  EditConnectionsAllOrganizations: 'edit-connections-all-organizations',
  ViewAllOrganizations: 'view-all-organizations',
  EditAllOrganizations: 'edit-all-organizations',
  AssignRootRole: 'assign-root-role',

  // Users
  ViewUsers: 'view-users',
  EditUsers: 'edit-users',
  ViewAllUsers: 'view-all-users',
  EditAllUsers: 'edit-all-users',
} as const;

export type Policy = (typeof Policy)[keyof typeof Policy];

export const ALL_ROLES: readonly Role[] = Object.freeze(Object.values(Role));

export const ALL_POLICIES: readonly Policy[] = Object.freeze(Object.values(Policy));

/** Narrows an arbitrary string (API response, JWT claim, ...) to a known role. */
export function isRole(value: string): value is Role {
  return (ALL_ROLES as readonly string[]).includes(value);
}

/** Narrows an arbitrary string (API response, JWT claim, ...) to a known policy. */
export function isPolicy(value: string): value is Policy {
  return (ALL_POLICIES as readonly string[]).includes(value);
}
