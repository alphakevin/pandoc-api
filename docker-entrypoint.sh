#!/bin/sh

set -e

if [ "$1" = 'pandoc-api' ]; then
  cd /app
  node lib/index.js start
fi

exec env "$@"
