FROM node:20-alpine AS build
WORKDIR /repo/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /repo/backend/dist ./dist

COPY backend/scripts ./scripts

CMD ["node", "dist/index.js"]
