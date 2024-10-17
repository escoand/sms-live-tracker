#!/bin/sh -e

[ $# = 1 ] && NUMBER=$1 || NUMBER=$(cat)
DATETIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TMP=$(mktemp)

umask 022

echo "SMS send to $NUMBER" >&2
sms.sh SEND "+${NUMBER:?}" "${PASSWORD:?}"

jq -c \
    --arg number "$NUMBER" \
    --arg datetime "$DATETIME" \
    '(.features[] | select(.properties.number == $number) | .properties.requested) |= $datetime' \
    "$POSITIONS" >"$TMP"
cp "$TMP" "$POSITIONS"
rm -f "%TMP"

echo "HTTP/1.1 200 OK"
echo