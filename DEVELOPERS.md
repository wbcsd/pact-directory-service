# Development

## Prerequisites

Install the following tools:

NodeJs (>= 22?). 
Docker (>= 28?).

## Setup development environment

npm install
npm approve-builds

### api 

Copy the .env.example to .env and adapt:

```
$ cd apps/api
$ cp .env.example .env
$ docker compose up
$ npm run db:migrate
$ npm run db:add-user user@test.org TestUser test administrator TestComp test-comp-id

$ npm run dev
```

### directory-portal

Copy the .env.example to .env and adapt where necessary.

```
$ cd apps/api
$ cp .env.example .env
$ npm run dev
```
## Environment variables

TODO

