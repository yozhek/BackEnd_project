FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json tsconfig.node.json vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src
RUN npm install
RUN npm run build
CMD ["npm","run","preview","--","--host","--port","4173"]
