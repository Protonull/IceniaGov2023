#!/bin/bash
cd "$(dirname "$0")" || exit

deno run -A compiler.ts