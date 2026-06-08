# PACT Directory Service - AI Coding Instructions

## Architecture
npm workspaces monorepo: Express.js API (`packages/api`) + React/Vite frontend (`packages/directory-portal`). Provides organization registration, directory search, node management, and authentication-as-a-service for the [PACT Network](https://www.carbon-transparency.org/network) (PCF data exchange).

## Development Commands
```bash
npm run dev                              # Start both apps from root
cd packages/api && npm run dev               # API only (tsx watch, hot reload)
cd packages/directory-portal && npm run dev  # Frontend only (Vite)
cd packages/api && npm test                  # Jest tests
cd packages/directory-portal && npm test     # Vitest tests
cd packages/api && npm run db:migrate        # Run Kysely migrations
cd packages/api && docker compose up -d      # Start local PostgreSQL
```
First-time setup: see `DEVELOPERS.md` (requires Node ≥20.9, Docker).

## Backend Patterns (packages/api)

### Route → Context → Service flow
All routes use a `context` middleware wrapper that injects `services` (from `ServiceContainer`) and `context` (user auth) into handlers. Pattern in `src/routes/index.ts`:
```ts
router.get('/directory/nodes/:id', authenticate, context(async (req) => {
  return req.services.node.get(req.context, parseInt(req.params.id));
}));
```
- `authenticate` middleware validates JWT, populates `res.locals.user`
- `context(handler)` casts request to `ContextRequest` with `.services` and `.context`
- Return value auto-sent as JSON; throw custom errors for HTTP error responses

### Services
- All business logic lives in `src/services/`, exported via `ServiceContainer` in `src/services/index.ts`
- Constructor-injected dependencies (db, other services): `new NodeConnectionService(db, nodeService, emailService, baseUrl)`
- Policy-based access: services call `registerPolicy([Role.Administrator], 'view-nodes-own-organization')` at module level, then check `context.policies.includes(...)` in methods
- Custom errors from `src/common/errors.ts`: `NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `ConflictError`, `RequestTimeoutError`, `TooManyRequestsError`

### Database
- **Kysely** ORM with `CamelCasePlugin` — write `camelCase` in TypeScript, auto-converts to/from `snake_case` in PostgreSQL
- Table interfaces in `src/database/types.ts` — use `Generated<T>` for auto-generated columns
- Migrations in `src/database/migrations/` — named `YYYY_MM_DD_HH_MM_SS_description.ts`, export `up(db)` and `down(db)`
- Path alias: use `@src/` for all API imports (e.g., `import config from '@src/common/config'`)

### Testing (Jest)
- Use `createMockDatabase()` from `src/common/mock-utils.ts` for Kysely mocking — returns chainable query builder mocks with `executeTakeFirst`, `execute`, etc.
- Test files co-located: `node-service.test.ts` next to `node-service.ts`
- Create typed `UserContext` fixtures for different roles (admin, root, user) to test access control

### OpenAPI
- Spec in `packages/api/openapi.yaml` — validated at runtime by `express-openapi-validator` when `ENABLE_OPENAPI_VALIDATION=true`
- All `/api/directory/*` and `/api/im/*` routes must match the spec
- Internal node PACT routes (`/api/nodes/:nodeId/*`) in separate `src/routes/internal-node-routes.ts`

## Frontend Patterns (packages/directory-portal)

### Radix Themes — primary UI framework
The frontend uses **`@radix-ui/themes`** as a pre-styled component library. The `<Theme>` provider in `main.tsx` configures the global visual identity:
- **Brand colors:** Primary `#09094e` (mapped to `indigo` accent, overridden via `--indigo-9`), Secondary `#00a47d` (mapped to `jade`)
- **Font:** Axiforma (custom), mapped via `--default-font-family` / `--heading-font-family` CSS tokens on `.radix-themes`
- **Appearance:** `appearance="light"` only (no dark mode)

**Prefer Radix Themes components over primitives or custom CSS:**
- Layout: `Flex`, `Box`, `Grid`, `Section`, `Container` — use props (`gap`, `p`, `m`, `direction`) not inline `style={{}}`
- Typography: `Heading`, `Text` — use `size`, `weight`, `color` props
- Data: `Table.Root`/`Header`/`Body`/`Row`/`Cell`/`ColumnHeaderCell`
- Feedback: `Badge` (for status), `Callout`, `Spinner`
- Inputs: `TextField.Root`, `Select.Root`/`Trigger`/`Content`/`Item`, `Switch`, `Checkbox`
- Overlay: `Dialog.Root`/`Content`/`Title`/`Description`/`Close`, `Tooltip`
- Actions: `Button` (use `variant`, `size`, `color` props — not custom wrappers), `IconButton`

**Only use Radix Primitives when no Themes equivalent exists:**
- `@radix-ui/react-form` — for form validation (`Form.Field`, `Form.Control`, `Form.Message`) — Themes has no form validation component

### UI Components — `src/components/ui/`
Thin validation wrappers around `@radix-ui/react-form` + Themes inputs:
- `<TextField>` — FormField + Form.Control + Themes TextField.Root + optional TooltipIcon
- `<FormField>` — Form.Field + Form.Label + valueMissing message + customErrors slot
- `<SelectField>` — FormField + Themes Select

Import from barrel: `import { TextField, FormField, SelectField, TooltipIcon } from "../components/ui"`

### Layouts — use `src/layouts/`
- `LandingPageLayout` — auth pages (login, signup, password reset)
- `FunctionalPageLayout` — sidebar navigation wrapper with loading state
- `GridPageLayout` — list/table pages with title, subtitle, action buttons
- `FormPageLayout` — form pages (wraps FunctionalPageLayout + PageHeader + centered Box)

### Routing & Guards
- Routes in `src/AppRoutes.tsx`, gated by feature flags from `src/utils/feature-flags.ts`:
  - `featureFlags.enableNodeManagement` (env: `VITE_ENABLE_NM`)
  - `featureFlags.enableOrganizationManagement` (env: `VITE_ENABLE_OM`)
- `<PolicyGuard policies={["view-all-organizations"]}/>` for role-based UI access
- Auth via `AuthContext` — `useAuth()` hook provides `profileData`, `login()`, `logout()`
- API calls use `fetchWithAuth()` / `proxyWithAuth()` from `src/utils/auth-fetch.ts` (auto-injects JWT, redirects to /login on 401)

### Frontend Testing (Vitest)
- Co-located test files (e.g., `ConformanceTestListPage.test.tsx`)
- Uses `@testing-library/react` with `jsdom` environment
- Mock `useAuth` and `fetchWithAuth` for isolated component tests

## Key Conventions
- **Radix Themes first** — use Themes components + props for styling; avoid inline `style={{}}` and custom CSS where Themes provides an equivalent
- **Never use Material UI** — this project uses Radix UI exclusively
- **`@radix-ui/react-form`** is the only primitive kept alongside Themes (no Themes form validation exists)
- Config helpers in `src/common/config.ts`: `required(key)`, `bool(key)`, `int(key)` for env vars
- `ListQuery.parse(req.query)` standardizes pagination/search/sort/filter for list endpoints
- New services must be added to both the `Services` interface and `ServiceContainer` class in `src/services/index.ts`
