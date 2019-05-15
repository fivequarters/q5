FROM node:10.15.3-slim

WORKDIR /fuse

ADD package.json ./
ADD tsconfig.json ./
ADD yarn.lock ./
ADD api ./api
ADD lib ./lib
ADD tool ./tool
ADD sdk ./sdk

RUN yarn setup \
  && yarn build function-lambda \
  && yarn build function-api

EXPOSE 3001

CMD ["node", "api/function-api"]
