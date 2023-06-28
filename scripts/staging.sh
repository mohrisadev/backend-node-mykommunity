#! /bin/bash

export DATABASE_URL=postgresql://postgres:postgres@kommunity.cvwa1hjqm5r6.ap-south-1.rds.amazonaws.com:5432/kommunity
export REDIS_URL=redis://127.0.0.1:6379
export HASURA_GRAPHQL_ADMIN_SECRET=secret

export JWT_SECRET=changeThisOnProd

yarn

cd hasura/

hasura migrate apply --database-name default
hasura metadata apply

cd ..

docker compose -f docker/docker-compose-staging.yml up -d

# nodemon src/index.js
