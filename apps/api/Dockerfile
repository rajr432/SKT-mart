# --- Build stage ---
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /repo

# Copy monorepo manifests for workspace-aware install
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

# Copy API source + shared tsconfig
COPY apps/api apps/api

# Generate Prisma client, compile TS
WORKDIR /repo/apps/api
RUN npx prisma generate
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /repo/apps/api/package.json ./package.json
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/prisma ./prisma
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/api/node_modules ./apps/api/node_modules 2>/dev/null || true

# Start script: run migrations then launch server
RUN printf '#!/bin/sh\nset -e\nnpx prisma migrate deploy\nexec node dist/index.js\n' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 4000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/app/start.sh"]
