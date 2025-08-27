#!/bin/sh

VERSION=v1.46.0
TMP=$(mktemp)

set -e

curl -Lvo "$TMP" "https://github.com/capcom6/android-sms-gateway/raw/refs/tags/$VERSION/app/src/main/assets/api/swagger.json"
deno run --allow-all \
    npm:swagger-typescript-api generate --add-readonly --path "$TMP"
mv Api.ts types.d.ts