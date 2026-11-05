#!/usr/bin/env bash
# ZAPWISE//OS build: edit app.js (source), then run this to refresh app.min.js (what the page loads).
set -euo pipefail
cd "$(dirname "$0")"
T=${TERSER:-/tmp/pw/node_modules/.bin/terser}
node --check app.js
"$T" app.js -c passes=2 -m --ecma 2017 --comments '/^!/' -o app.min.js
node --check app.min.js
echo "app.js $(wc -c <app.js) B -> app.min.js $(wc -c <app.min.js) B (gzip $(gzip -9c app.min.js | wc -c) B)"
