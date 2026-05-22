#!/usr/bin/env bash

set -euo pipefail

bun typecheck
bunx vp check
bunx vp test

bun scripts/check-import-depth.ts
bun scripts/check-zod-v4.ts
bun scripts/check-drizzle-schema-naming.ts
bun scripts/drizzle-checksums.ts verify
