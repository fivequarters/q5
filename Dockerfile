FROM node:14.16.0-alpine3.13

WORKDIR /fuse

ADD package.json ./
ADD tsconfig.json ./
ADD yarn.lock ./
ADD .yarnrc ./
ADD .yarn/releases/yarn-1.21.1.cjs ./.yarn/releases/yarn-1.21.1.cjs
ADD api ./api
ADD lib ./lib
ADD tool ./tool
ADD sdk ./sdk

RUN apt-get update && apt-get install -y zip
RUN yarn setup
RUN yarn build function-api

EXPOSE 3001

CMD ["node", "api/function-api"]
