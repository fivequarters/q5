FROM node:14.17.2-alpine3.13
# Patch container
RUN apk --update-cache upgrade

# Install dependencies first
RUN apk add zip
RUN apk add libcap
RUN apk add git
# Give nodejs ability to listen to port 80
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node
# Add service user
RUN adduser fusebit -D
USER fusebit
# Set working directory
WORKDIR /home/fusebit/

ADD --chown=fusebit package.json ./
ADD --chown=fusebit tsconfig.json ./
ADD --chown=fusebit yarn.lock ./
ADD --chown=fusebit .yarnrc ./
ADD --chown=fusebit .yarn/releases/yarn-1.21.1.cjs ./.yarn/releases/yarn-1.21.1.cjs
ADD --chown=fusebit api ./api
ADD --chown=fusebit lib ./lib
ADD --chown=fusebit tool ./tool
ADD --chown=fusebit sdk ./sdk

RUN yarn setup
RUN yarn build function-api

EXPOSE 3001

CMD ["node", "api/function-api"]
