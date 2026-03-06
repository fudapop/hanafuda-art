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
COPY packages/landing/dist/ packages/landing/dist/

WORKDIR /app/packages/backend

EXPOSE 3000
CMD ["pnpm", "start"]
