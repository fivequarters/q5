FROM node:14.16.0-alpine3.13
# install dependencies first
RUN apk add zip
RUN apk add libcap
# give nodejs ability to listen to port 80
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node
# add service user
RUN adduser fusebit -D
USER fusebit
# set working directory
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
