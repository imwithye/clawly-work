FROM node:22-slim
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --filter @clawly-work/db
COPY packages/db ./packages/db
WORKDIR /app/packages/db
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
CMD ["npx", "drizzle-kit", "push"]
