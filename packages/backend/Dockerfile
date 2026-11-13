FROM node:22-slim AS base
RUN corepack enable

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package manifests
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/landing/package.json packages/landing/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @hanafuda/backend...

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
COPY packages/landing/ packages/landing/

# `pnpm start` runs node dist/index.js. The previous image never compiled.
RUN pnpm --filter @hanafuda/backend build

# The server serves ../landing/dist. The page in the repo is index.html.
RUN mkdir -p packages/landing/dist \
  && cp packages/landing/index.html packages/landing/dist/index.html

WORKDIR /app/packages/backend

EXPOSE 3000
CMD ["pnpm", "start"]
