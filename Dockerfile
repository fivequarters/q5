FROM node:10.15.3-slim

WORKDIR /flx

ADD package.json ./
ADD tsconfig.json ./
ADD yarn.lock ./
ADD api ./api
ADD lib ./lib
ADD tool ./tool
ADD mono ./mono

RUN yarn setup \
    && yarn build pubsub \
    && yarn build flexd-functions \
    && yarn build mono 

EXPOSE 3001
EXPOSE 5002

CMD ["node", "mono"]
