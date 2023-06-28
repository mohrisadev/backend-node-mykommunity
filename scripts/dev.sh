#! /bin/bash

export DATABASE_URL=postgres://postgres:your_password@postgres:5432/postgres
export HASURA_GRAPHQL_DATABASE_URL=postgres://postgres:your_password@postgres:5432/postgres
export REDIS_URL=redis://127.0.0.1:6379

export JWT_SECRET=changeThisOnProd
export PORT=3000
export NODE_ENV=development

docker-compose -f docker/docker-compose-dev.yml up -d

nodemon src/index.js 