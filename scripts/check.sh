#!/usr/bin/env bash

set -euo pipefail

bun typecheck
bunx vp check
bunx vp test
