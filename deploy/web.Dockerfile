# syntax=docker/dockerfile:1.7

# Builder — installs the workspace dependency closure the web app needs
# (api-client depends on api-contracts). Manifests first for a cached install.
FROM oven/bun:1.3.13-alpine AS builder

WORKDIR /monorepo

COPY package.json bun.lock tsconfig.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
COPY packages/api-contracts/package.json packages/api-contracts/

RUN bun install --ignore-scripts

COPY apps/web apps/web
COPY packages packages

# Dev — Vite dev server with HMR. The compose service mounts the repo over
# /monorepo for live source but keeps this stage's node_modules through an
# anonymous volume at /monorepo/node_modules, so the linux-native rollup and
# tailwind/oxide binaries are not shadowed by the darwin host's node_modules.
FROM builder AS dev

WORKDIR /monorepo/apps/web

CMD ["bun", "run", "dev"]
