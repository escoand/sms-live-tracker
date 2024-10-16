#!/bin/bash -e

ACTION=$1

exec 3<>/dev/ttyUSB1

com() {
    printf '%s\r' "$1" >&3
    while read -r -t1 -u 3 OUT; do
        printf %s "$OUT"
    done
}

# pin
com AT+CPIN? |
    grep -q "+CPIN: SIM PIN" &&
    com "AT+CPIN=$PIN"

# send sms
if [ "$ACTION" = SEND ]; then
    com "AT+CMGF=1" >/dev/null
    com "AT+CMGS=\"$2\""
    com "$3$(printf '\032')"

# list sms
elif [ "$ACTION" = RECEIVE ]; then
    com "AT+CMGF=0" >/dev/null
    com "AT+CMGL=4" |
        tr '\r' '\n' |
        while read -r LINE; do
            echo "$LINE" | grep -q "+CMGL:" || continue
            MSGID=${LINE#*: }
            MSGID=${MSGID%%,*}
            echo "MSGID $MSGID"

            read -r LINE2
            [ "$DEBUG" ] && echo "# $LINE2"
            echo "$LINE2" | {

                read -r -N2 LEN1
                read -r -N2 TYPE1
                LEN1=$((16#$LEN1 * 2 - 2))
                read -r -N$LEN1 SMSC
                SMSC=$(echo "$SMSC" | sed 's|\(.\)\(.\)|\2\1|g; s|F$||')
                [ "$DEBUG" ] && echo "# $LEN1 $SMSC"

                read -r -N2 _

                read -r -N2 LEN2
                read -r -N2 TYPE2
                LEN2=$((16#$LEN2))
                LEN2=$((LEN2 % 2 + LEN2))
                read -r -N$LEN2 SENDER
                SENDER=$(echo "$SENDER" | sed 's|\(.\)\(.\)|\2\1|g; s|F$||')
                [ "$DEBUG" ] && echo "# $LEN2 $SENDER"
                echo "SENDER $SENDER"

                # ignore
                read -r -N2 _
                read -r -N2 _

                read -r -N14 TIMESTAMP
                TIMESTAMP=$(echo "$TIMESTAMP" | sed 's|\(.\)\(.\)|\2\1|g; s|^\(..\)\(..\)\(..\)\(..\)\(..\)\(..\)|20\1-\2-\3T\4:\5:\6+|')
                echo "TIMESTAMP $TIMESTAMP"

                read -r -N2 LEN3
                read -r MSG
                printf 'MSG '
                echo "$MSG" | gsm2ascii | base64 -w0
            }

            echo
            echo
        done

# reas sms
elif [ "$ACTION" = READ ]; then
    com "AT+CMGR=$2"

# delete sms
elif [ "$ACTION" = DELETE ]; then
    com "AT+CMGD=$2"

# info
elif [ "$ACTION" = INFO ]; then
    com "AT&V"
    com "ATI"

fi
