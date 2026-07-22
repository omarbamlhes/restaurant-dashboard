# syntax=docker/dockerfile:1.7
# ───────────────────────────────────────────────────────────
# Next.js Web — standalone output for minimal runtime
# ───────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /repo

# ───────────────────────────────────────────────────────────
# Stage: deps — install workspace deps for build
# ───────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc* ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# ───────────────────────────────────────────────────────────
# Stage: build — compile Next.js with standalone output
# ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @app/web run build

# ───────────────────────────────────────────────────────────
# Stage: runner — minimal Node.js runtime
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
