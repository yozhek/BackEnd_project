FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY src ./src

RUN npm install --legacy-peer-deps

EXPOSE 3003
CMD ["npm","run","start"]
