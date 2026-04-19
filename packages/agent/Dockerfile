FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/agent/package.json packages/agent/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/agent/node_modules ./packages/agent/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY packages/agent ./packages/agent
COPY packages/db ./packages/db
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
WORKDIR /app/packages/agent
CMD ["node", "--import", "tsx/esm", "src/worker.ts"]
