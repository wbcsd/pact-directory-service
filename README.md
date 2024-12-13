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

### Timeline
- A working group was formed in September 2024 to co-create PACT Identity Management service
- A Vision Paper is currently being drafted and evolved by the community, planned for publication January 2025
- An MVP is being developed and ready for testing by January 6, 2025
- MVP test phase will be conducted in January & February 2025 
  
### Development Approach
PACT's primary mission is to enable carbon-informed business decisions through PCF transparency. We view technology as an enabler of this mission, but remain sharply focused on the ultimate mission of decarbonization and avoid getting lost in the complexity that technology can sometimes bring.

The community has chosen to take an approach to building the Identity Management service of the PACT Network in a highly iterative, "test and learn" approach. Although we hypothesize an Identity Management service will bring value to the organizations of the PACT Network, as with any new solution, we first focus on proving this hypothesis by building quickly a simple, functional MVP of the hypothesized feature set critical to bring highest value, and test this with real end users. Based on this testing phase, and the demand and growth of solutions on the PACT Network, we will then leverage insights from MVP testing to further evolve the Identity Management service.

Put simply, we are building a skateboard to start testing, while keeping the Ferrari in sight:
![image](https://github.com/user-attachments/assets/6a9c4843-6f6a-4004-a7a8-f3d49e1ba4be)

This approach implies:
- The goal of the MVP is to develop learnings from testing the MVP with organizations who are currently building solutions for PCF exchange
- Only the *minimal* set of functional requirements are being considered in-scope for the MVP; these include the basic functionalities of 1. Registration 2. Discoverability and 3. System Authentication
- The technical design of the MVP is chosen to most rapidly enable a functioning solution for testing, and will absolutely evolve as the project evolves. For example:
  - For MVP, we opt to implement a UI-based solution rather than an API, which we believe will better facilitate feedback from the community during testing than an API-based solution which would be difficult for non-technical users to understand and share feedback; future version of Identity Management service would most certainly be offered as an API service
  - For MVP, the least complex solution is to build a lightweight "authentication as a service" functionality, implementing an Identity Provider built upon standard OAuth libraries. This can then be easily customized as community needs are understood better through MVP testing. In its more mature version, we will certainly consider the benefit of using off-the-shelf and/or open source identity server implementations (Keyclosk, Auth0, etc.), which may incur additional costs and limit flexibility but provide rigorous state-of-the-art security capabilities 
  - To provide common services to all solutions on the Network, the simplest approach we take for MVP is to introduce a common "centralized" service; this introduces potential security vulnerabilities which would be addressed in future versions as the service evolves into a Federated architecture, once the value proposition of Identity Management on the PACT Network is proven and organizations begin scaling their connections
- MVP will be tested by organizations in the PACT community currently developing PACT Conformant Solutions; MVP testing will be conducted in a Non-Prod environment
- Following learnings from MVP testing with the community, a product roadmap will be developed and the technical architecture adapted to reflect learnings


### How to get involved
- We welcome any organization globally to get involved in this project. Write to Beth Hadley (hadley@wbcsd.org) to learn more.
