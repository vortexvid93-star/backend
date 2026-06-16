# syntax=docker/dockerfile:1

# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# ─── Dépendances (cache layer) ────────────────────────────────────────────────
FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci

# ─── Build production ─────────────────────────────────────────────────────────
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# ─── Dépendances production ───────────────────────────────────────────────────
FROM base AS prod-deps

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# ─── Image développement (docker-compose.yml — target: development) ───────────
FROM base AS development

ENV NODE_ENV=development

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .
COPY docker/entrypoint.dev.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]

# ─── Image production (cible par défaut — Render, docker-compose.prod.yml) ────
FROM base AS production

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --chown=nestjs:nodejs docker/entrypoint.prod.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

USER nestjs

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
