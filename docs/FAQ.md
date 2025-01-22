
## FAQ
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

**What development approach is PACT taking to create the Identity Management service?**  
The community has chosen to take an approach to building the Identity Management service of the PACT Network in a highly iterative, "test and learn" approach. Although we hypothesize an Identity Management service will bring value to the organizations of the PACT Network, as with any new solution, we first focus on proving this hypothesis by building quickly a simple, functional MVP of the hypothesized feature set critical to bring highest value, and test this with real end users. Based on this testing phase, and the demand and growth of solutions on the PACT Network, we will then leverage insights from MVP testing to further evolve the Identity Management service.
