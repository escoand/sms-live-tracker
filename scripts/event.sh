#!/bin/sh -e

EVENT=$1
FILE=$2
TMP=$(mktemp)

# sent event
if [ "$EVENT" = SENT ]; then
    NUMBER=$(tr '\r' '\n' <"$FILE" | awk -F': ' '$1=="To" { print $2 }')
    DATETIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq -c \
        --arg number "$NUMBER" \
        --arg datetime "$DATETIME" \
        '(.features[] | select(.properties.number == $number) | .properties.requested) |= $datetime' \
        "$POSITIONS" >"$TMP" &&
        cat "$TMP" >"$POSITIONS" ||
        echo "failed event $EVENT: $FILE" >&2

# received event
elif [ "$EVENT" = RECEIVED ]; then
    NUMBER=$(tr '\r' '\n' <"$FILE" | awk -F': ' '$1=="From" { print $2 }')
    LAT=$(tr '\r' '\n' <"$FILE" | awk -F':' '$1=="Lat" { print $2 }')
    LON=$(tr '\r' '\n' <"$FILE" | awk -F':' '$1=="Lon" { print $2 }')
    DATETIME=$(tr '\r' '\n' <"$FILE" | awk -F'[:/ ]' '$1=="T" { printf "20%02i-%02i-%02iT%02i:%02i:%02i+0100",$4,$3,$2,$5,$6,$7 }')
    BATTERY=$(tr '\r' '\n' <"$FILE" | awk -F':' '$1=="Bat" { print $2 }')
    ID=$(tr '\r' '\n' <"$FILE" | awk -F':' '$1=="ID" { print $2 }')
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
        "$POSITIONS" >"$TMP" &&
        cat "$TMP" >"$POSITIONS" ||
        echo "failed event $EVENT: $FILE" >&2

# else
else
    echo "unhandled event $EVENT: $FILE" >&2

fi

rm -f "$TMP"
