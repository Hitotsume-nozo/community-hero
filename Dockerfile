# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────
# Community Hero — single-container build for Google Cloud Run
# Stage 1 builds the React client + TypeScript server.
# Stage 2 is a slim runtime that serves the built client from the API.
# ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm install --prefix server && npm install --prefix client

# Build client (Vite) then server (tsc)
COPY . .
RUN npm run build

# ─── runtime ───
FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

# Only production server deps
COPY server/package*.json ./server/
RUN npm install --omit=dev --prefix server && npm cache clean --force

# Built artifacts
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

# Cloud Run sends traffic to $PORT (default 8080)
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
