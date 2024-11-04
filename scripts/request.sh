#!/bin/sh -e

[ $# = 1 ] && NUMBER=$1 || NUMBER=$(cat)
TMP=$(mktemp -u "/var/spool/sms/outgoing/XXXXXXXXXX")

{
    echo To: "$NUMBER"
    echo
    echo "$PASSWORD"
} >"$TMP"

echo "HTTP/1.1 200 OK"
echo
