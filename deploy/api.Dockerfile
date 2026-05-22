# syntax=docker/dockerfile:1.7

# Builder — installs the workspace dependency closure the API needs.
# Only the manifests are copied first so the install layer caches across
# source edits. The closure is api-contracts + config-module + nestjs-shared
# (nestjs-shared depends on config-module).
FROM oven/bun:1.3.13-alpine AS builder

WORKDIR /monorepo

COPY package.json bun.lock tsconfig.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/api-contracts/package.json packages/api-contracts/
COPY packages/config-module/package.json packages/config-module/
COPY packages/nestjs-shared/package.json packages/nestjs-shared/

RUN bun install --ignore-scripts

COPY apps/api apps/api
COPY packages packages

# Dev — hot-reload via `bun run --hot`. The compose service mounts the repo
# over /monorepo for live source, and keeps this stage's node_modules through
# an anonymous volume so the linux deps survive the darwin host mount.
FROM builder AS dev

WORKDIR /monorepo/apps/api

CMD ["bun", "run", "dev"]
