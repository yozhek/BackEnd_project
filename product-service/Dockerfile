FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json tsconfig.json vitest.config.mts ./
COPY src ./src

RUN npm install --legacy-peer-deps

EXPOSE 3000
CMD ["npm","run","start"]
