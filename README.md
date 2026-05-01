# PACT Network Services

## About this Project

[PACT Network](https://www.carbon-transparency.org/network) establishes an open and global network of interoperable solutions for the secure peer-to-peer exchange of accurate, primary and verified Product Carbon Footprint (PCF) data — across all industries and value chains.

This repository hosts the **PACT Network Services platform**: a hub of services that supports solution providers and their customers in adopting the PACT [Technical Specifications for PCF Data Exchange](https://docs.carbon-transparency.org/) and in exchanging real PCF data across the network.

The platform is available at [services.carbon-transparency.org](https://services.carbon-transparency.org/).

## Services

The platform currently offers two services, with more planned. Each service is exposed through a shared portal UI on top of a single backend API.

### Conformance Service

Helps service providers make their software PACT-conformant. Solutions implementing the [PACT Technical Specifications](https://docs.carbon-transparency.org/) can use the Conformance Service to automatically run the conformance test suite against their implementation, review per–test-case results, and iterate until they pass — a prerequisite for joining the PACT Network and seamlessly exchanging carbon footprint data with other parties.

In this repo the Conformance Service is integrated via a proxy in the API (`/api/proxy/test*`) that forwards authenticated test runs to the external [pact-conformance-test-service](https://github.com/wbcsd/pact-conformance-test-service) and surfaces results in the portal.

### Data Exchange Sandbox

Simplifies piloting real PCF data exchange with multiple companies across a supply chain. An organization can:

- Spin up one or more **nodes** — virtual PACT-conformant hosts inside the platform.
- Create, import and publish **product footprints** on a node.
- Establish **connections** with nodes hosted by other organizations (either also in the sandbox, or external PACT-conformant solutions).
- Send and fulfill **PCF requests** between connected nodes.
- Inspect **activity logs** for every request that flows through a node.

Each internal node exposes a fully PACT v3-compliant API surface (OAuth2 client-credentials auth, `/3/footprints`, `/3/events`), so internal and external nodes are interchangeable from a client's perspective. See [docs/internal-node-virtual-pact-api.md](docs/internal-node-virtual-pact-api.md) and [docs/pact-v3-conformance-implementation.md](docs/pact-v3-conformance-implementation.md) for details.

The Sandbox is intended to lower the barrier to running pilots: solution providers can demonstrate end-to-end PCF exchange without needing every counterparty to have a production deployment, and customers can validate flows without committing to a single vendor.

### Future additions

Possible future services include:

- **Directory Service** — for discovering and identifying parties on the PACT Network and managing trust between them. (An early identity-management MVP previously lived in this repo and informed the platform's current design — see *History* below.)
- **Data Model Extension registry** — for registering and discovering extensions to the PACT data model that support scenarios beyond the core carbon-footprint use case.

## Repository structure

This is an npm workspaces monorepo.

```
apps/
  api/                  Express.js + PostgreSQL backend serving the platform
  directory-portal/     React (Vite) frontend — the PACT Network Services portal
packages/
  pact-api-client/      HTTP client for PACT-conformant APIs (used by the API
                        to talk to internal and external nodes)
  pact-data-model/      TypeScript types and JSON schemas for PACT data model
                        versions v2.0, v2.1, v2.2, v2.3 and v3.0
docs/                   Design notes, integration guide, diagrams
```

The two `packages/*` libraries are consumed by the backend API via workspace references and may eventually be published independently.

## Getting started

For full local development setup — prerequisites, database, env files, scripts, troubleshooting — see [DEVELOPERS.md](DEVELOPERS.md).

In short:

```bash
git clone https://github.com/wbcsd/pact-directory.git
cd pact-directory
npm i

# Start Postgres
cd apps/api && docker compose up -d && npm run db:migrate && cd ../..

# Run API + portal
npm run dev
```

The API runs at `http://localhost:3010` and the portal at `http://localhost:5173`.

## History

The platform grew out of an Identity Management initiative for the PACT Network. The earlier history of this repository is preserved here for context:

- **September 2024** — A working group was formed to co-create the PACT Identity Management service.
- **October – December 2024** — An Identity Management MVP was developed.
- **January 2025** — Alpha MVP testing phase launched.
- **March 2025** — Beta MVP testing phase launched; the [PACT Identity Management Vision Paper](https://www.carbon-transparency.org/resources/pact-identity-management-vision-paper) was published.
- **October 2025** — Learnings from MVP testing fed into a broader **PACT Network Services platform**, with the Conformance Service shipped first.
- **January 2026** — Preview of Data Exchange Sandbox release and evaluated.
- **April 2026** — Release of Data Exchange Sandbox.Additional services like Directory / Identity Management service is planned as a future addition.

The original Identity Management integration guide and FAQ remain in [docs/](docs/) for reference.

## License

[MIT](https://opensource.org/license/mit)

## How to get involved

We welcome any organization globally to get involved. Write to Gertjan Schuurmans (schuurmans@wbcsd.org) or pact-support@wbcsd.org to learn more, or open an issue on this repository.
