# syntax=docker/dockerfile:1

FROM node:20-slim AS builder

RUN npm install -g pnpm@12

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/

RUN pnpm build

FROM node:20-slim AS runner

RUN npm install -g pnpm@12 \
  && groupadd -r mcp \
  && useradd -r -g mcp -d /app -s /sbin/nologin mcp

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

COPY --from=builder /app/dist ./dist
RUN chown -R mcp:mcp /app

USER mcp

ENV NODE_ENV=production

CMD ["node", "dist/cli.js"]
