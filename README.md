# PACT Identity Management


## About this Project

PACT Network establishes an open and global network of interoperable solutions for the secure peer-to-peer exchange of accurate, primary and verified PCF data - across all industries and value chains.

Identity Management is a foundational service of the PACT Network. Identity Management enables organizations to securely and efficiently identify and establish trust connections with each other at scale, facilitating PCF exchange between solutions.

Without Identity Management, organizations attempting to exchange PCF data over the PACT Network currently face the following challenges:
- **No discoverability**: organizations don't know which other organizations have PCFs and are looking to exchange this data
- **Insecure credential exchange**: solutions have no common way of exchanging credentials prior to Authentication, resulting in credential exchange happening often via insecure channels (i.e. over email)
- **Cumbersome and hard to maintain system authentication**: each solution must maintain the identities and credentials of every other solution their customers wish to connect to themselves, which is unmanageable at scale 
- **Limited identity integrity**: organizations have no mechanism to prove their identity to others, critical prior to the exchange of sensitive information like PCFs

### Design Principles 
The PACT community is now working to address these challenges by creating an open-source Identity Management service. This service is being designed using the following principles:
1. Easy & simple to use
2. Secure
3. Standards based
4. Global, low-cost and fair
5. Open and federated
6. Iterative

### What is IM?
In its initial form, PACT Identity Management Service will enable organizations the following capabilities:
- Register to PACT Network
- Find others on the PACT Network
- Connect to eachother and authentication eachother's PACT Conformant Solutions

The service will provide a robust high integrity registry of organizations on the PACT Network, ready to connect and exchange PCF information.

See the [technical design](https://github.com/wbcsd/pact-directory/blob/main/docs/authentication-as-a-service-design.md) for more details.


### Timeline
- A working group was formed in September 2024 to co-create PACT Identity Management service
- A Vision Paper is currently being drafted and evolved by the community, planned for publication January 2025
- An MVP is being developed and ready for testing by January 6, 2025
- MVP test phase will be conducted in January & February 2025 
  
### Development Approach
PACT's primary mission is to enable carbon-informed business decisions through PCF transparency. We view technology as an enabler of this mission, but remain sharply focused on the ultimate mission of decarbonization and avoid getting lost in the complexity that technology can sometimes bring.

The community has chosen to take an approach to building the Identity Management service of the PACT Network in a highly iterative, "test and learn" approach. Although we hypothesize an Identity Management service will bring value to the organizations of the PACT Network, as with any new solution, we first focus on proving this hypothesis by building quickly a simple, functional MVP of the hypothesized feature set critical to bring highest value, and test this with real end users. Based on this testing phase, and the demand and growth of solutions on the PACT Network, we will then leverage insights from MVP testing to further evolve the Identity Management service.

This approach implies:
- The goal of the MVP is to develop learnings from testing the MVP with organizations who are currently building solutions for PCF exchange
- Only the *minimal* set of functional requirements are being considered in-scope for the MVP; these include the basic functionalities of 1. Registration 2. Discoverability and 3. System Authentication
- The technical design of the MVP is chosen to most rapidly enable a functioning solution for testing, and will absolutely evolve as the project evolves. For example:
  - For MVP, we opt to implement a UI-based solution rather than an API, which we believe will better facilitate feedback from the community during testing than an API-based solution which would be difficult for non-technical users to understand and share feedback; future version of Identity Management service would most certainly be offered as an API service
  - For MVP, the least complex solution is to build a lightweight "authentication as a service" functionality, implementing an Identity Provider built upon standard OAuth libraries. This can then be easily customized as community needs are understood better through MVP testing. In its more mature version, we will certainly consider the benefit of using off-the-shelf and/or open source identity server implementations (Keycloak, Auth0, etc.), which may incur additional costs and limit flexibility but provide rigorous state-of-the-art security capabilities 
  - To provide common services to all solutions on the Network, the simplest approach we take for MVP is to introduce a common "centralized" service; this introduces potential security challenges which would be addressed in future versions as the service evolves, and organizations increasingly move into production solutions at scale. For now the priority is to get a functional service working for validation purposes.
  - We envision a federated architecture to enable a "network of networks approach", lowering barriers for organizations to connect and share data; MVP does not implement federation to any additional networks or sub-networks, but in parallel PACT is building partnerships with many initiatives which may find relevancy of federation to the PACT Network in the future
- MVP will be tested by organizations in the PACT community currently developing PACT Conformant Solutions; MVP testing will be conducted in a Non-Prod environment
- Following learnings from MVP testing with the community, a product roadmap will be developed and the technical architecture adapted to reflect learnings

### FAQ
We encourage feedback and questions from the community - this is the best way to ensure what is built is useful and applicable to you. We collect here FAQs as reference.

**What technologies does PACT leverage and reuse for building Identity Management?**  
Following our PACT design principles, we are building an Identity Management solution that is standards based, avoids reinventing the wheel, and leverages existing solutions when possible. For the MVP, we are building an Identity Provider, based on OAuth standard libraries and not leveraging a SaaS Identity Provider. The MVP is intended only as a functional MVP for testing purposes. For the post-MVP and production solution, we will explore SaaS / Open-source Identity Providers (like Keycloak): [technical design](https://github.com/orgs/wbcsd/projects/3/views/1?pane=issue&itemId=90816775)

**Will PACT issue Company identifiers?**  
No. PACT will enable organizations to leverage their existing standardized company identifiers (such as LEI by GLEIF, DUNS by Dun & Bradstreet, GLN by GS1, etc.). To ensure company identifiers can be trusted and interoperable, PACT may maintain a set of accredited providers using a federated model. PACT is establishing partnerships with the relevant organizations accordingly.

**How will different organizational “hierarchy” levels be accommodated?**  
PCFs are often calculated by one business “entity” (business unit, legal entity, parent entity, geographic entity) yet sold by a different business “entity”. The relationship between these entities will be critical to know, maintain accurately, and trust to ensure seamless PCF exchange on the PACT Network. PACT Identity Management service will leverage identity-provider organizations like GLEIF, DUNS, GS1, etc. responsible for maintaining such hierarchical relationships, to ensure the latest and most accurate information is maintained. 

**How does PACT Identity Management conduct KYC (Know Your Customer) processes?**  
Ensuring the integrity of identities on the PACT Network is critical to achieve our vision. Company identities will always be verified, yet processes will be established in a fit-for-purpose way that does not post unnecessary cost and/or burden. PACT envisions leveraging existing KYC processes companies must complete before receiving a company identifier; PACT does not envision conducting Know Your Customer processes ourselves.

**How does PACT's approach to Identity Management ensure Network security**  
Security is fundamental to the PACT Network and critical to ensuring PCF data remains uncompromised and trustworthy. Solutions on the PACT Network must pass conformance testing, ensuring all solutions conform to the same [authentication flow](https://wbcsd.github.io/data-exchange-protocol/v2/#api-auth) using OAuth and/or OpenID. Further, PACT Identity Management's Authentication as a Service enables solutions to exchange security credentials (access_token, client_secret, client_id) directly and securely. We recognize the need to ensure this service is highly robust, resilient to malicious intent, and compliant with the latest security standards. This said, we take a highly iterative approach to developing PACT Identity Management, and as the needs of the community evolve so to will the layers of security implemented.

### How to get involved
- We welcome any organization globally to get involved in this project. Write to Beth Hadley (hadley@wbcsd.org) to learn more.
