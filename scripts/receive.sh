#!/bin/sh -e

TMP=$(mktemp)

umask 022

sms.sh RECEIVE |
    tr '\r' '\n' |
    while read -r KEY VALUE; do

        if [ "$KEY" = MSGID ]; then
            MSGID=$VALUE

        elif [ "$KEY" = SENDER ]; then
            NUMBER=$VALUE

        elif [ "$MSGID" ] && [ "$NUMBER" ] && [ "$KEY" = MSG ]; then
            MSG=$(echo "$VALUE" | base64 -d | tr '\r' '\n')
            LAT=$(echo "$MSG" | awk -F':' '$1=="Lat" { print $2 }')
            LON=$(echo "$MSG" | awk -F':' '$1=="Lon" { print $2 }')
            DATETIME=$(echo "$MSG" | awk -F'[:/ ]' '$1=="T" { printf "20%02i-%02i-%02iT%02i:%02i:%02i+0100",$4,$3,$2,$5,$6,$7 }')
            BATTERY=$(echo "$MSG" | awk -F':' '$1=="Bat" { print $2 }')
            ID=$(echo "$MSG" | awk -F':' '$1=="ID" { print $2 }')

            [ ! "$ID" ] && unset MSGID NUMBER && continue
            echo "SMS received from $NUMBER: lon=$LON lat=$LAT ts=$DATETIME bat=$BATTERY" >&2

            [ "$LAT" ] && [ "$LON" ] && COORDS="[$LON,$LAT]" || COORDS="[]"
            jq -c \
                --arg number "$NUMBER" \
                --argjson coords "$COORDS" \
                --arg datetime "$DATETIME" \
                --arg battery "$BATTERY" \
                --arg id "$ID" \
                '
                    (.features[] | select(.properties.number == $number) | .geometry.coordinates) |= $coords |
                    (.features[] | select(.properties.number == $number) | .properties.received) |= $datetime |
                    (.features[] | select(.properties.number == $number) | .properties.battery) |= $battery |
                    (.features[] | select(.properties.number == $number) | .properties.id) |= $id
                ' \
                "$POSITIONS" >"$TMP"
            cp "$TMP" "$POSITIONS"
            rm -f "%TMP"

            sms.sh DELETE "$MSGID"
            unset MSGID NUMBER

        fi
    done
