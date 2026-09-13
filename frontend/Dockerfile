FROM node:20-alpine AS build
WORKDIR /repo

# O frontend depende de backend/src/types no build.
COPY backend/src/types ./backend/src/types
COPY frontend/package*.json ./frontend/

WORKDIR /repo/frontend
RUN npm ci

COPY frontend/ ./

ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN chmod -R +x node_modules/.bin
RUN npm run build

FROM caddy:2-alpine
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/frontend/dist /usr/share/caddy