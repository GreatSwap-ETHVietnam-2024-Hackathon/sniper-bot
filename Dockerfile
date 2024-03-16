FROM node:18-alpine

RUN apk add --no-cache python3 make g++
WORKDIR /Greatswap-bot

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 7777

CMD npm run typechain-build && npm run start-prod
