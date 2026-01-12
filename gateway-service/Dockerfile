FROM node:20-alpine
WORKDIR /app

COPY package.json tsconfig.json vitest.config.mts ./
COPY src ./src

RUN npm install --legacy-peer-deps

EXPOSE 3002
CMD ["npm","run","start"]
