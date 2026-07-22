# syntax=docker/dockerfile:1.7
# ───────────────────────────────────────────────────────────
# NestJS API — multi-stage build with pnpm workspaces
# ───────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /repo

# ───────────────────────────────────────────────────────────
# Stage: deps — install full workspace deps for building
# ───────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc* ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# ───────────────────────────────────────────────────────────
# Stage: build — generate Prisma client + compile NestJS
# ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY apps/api ./apps/api
RUN pnpm --filter @app/api exec prisma generate
RUN pnpm --filter @app/api run build

# Deploy production-only deps into a standalone directory
RUN pnpm --filter @app/api deploy --prod /app

# ───────────────────────────────────────────────────────────
# Stage: runner — minimal production image
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl tini
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/prisma ./prisma

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs && chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
