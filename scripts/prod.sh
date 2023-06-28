#! /bin/bash

export DATABASE_URL=postgresql://localhost/kommunity_prod
export REDIS_URL=redis://127.0.0.1:6379

export JWT_SECRET=changeThisOnProd
export NODE_ENV=production

yarn 

cd hasura/

hasura migrate apply --database-name default
hasura metadata apply

cd ..

docker compose -f docker/docker-compose-prod.yml up -d

# nodemon src/index.js