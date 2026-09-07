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

RUN npm run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
