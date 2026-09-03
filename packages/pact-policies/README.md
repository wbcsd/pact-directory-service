# @wbcsd/pact-policies

Single source of truth for the authorization **roles** and **access policies** of the
PACT Directory Service. Both the API (`packages/api`) and the directory portal
(`packages/directory-portal`) import from this package so that policy identifiers are
never typed by hand as string literals.

## Usage

```ts
import { Policy, Role } from "@wbcsd/pact-policies";

// Backend — register a policy for a set of roles
registerPolicy([Role.Administrator], Policy.ViewNodesOwnOrganization);

// Backend — enforce access
checkAccess(context, [Policy.ViewNodesAllOrganizations, Policy.ViewNodesOwnOrganization]);
```

```tsx
// Frontend — gate UI
<PolicyGuard policies={[Policy.ViewAllOrganizations]}>
  <OrganizationsPage />
</PolicyGuard>
```

## Adding a policy

1. Add a member to the `Policy` enum in [src/index.ts](src/index.ts).
2. Register it against the relevant roles in the owning API service via `registerPolicy`.
