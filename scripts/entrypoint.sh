#!/bin/sh -e

CONTAINER_NAME=${CONTAINER_NAME:-$(hostname)}
POSDIR=${POSITIONS%/*}
POSFILE=${POSITIONS##*/}

# init env
mkdir -p /var/spool/sms/checked \
    /var/spool/sms/incoming \
    /var/spool/sms/outgoing \
    "$POSDIR"
touch "$POSITIONS" /run/smsd.pid
chown -R smsd:smsd /var/spool/sms/ /run/smsd.pid
chmod 0777 /var/spool/sms/checked
chmod 0777 /var/spool/sms/incoming
chmod 0777 /var/spool/sms/outgoing

chown -R smsd:smsd "$POSDIR"
chmod 2755 "$POSDIR"
[ ! -f "$POSITIONS" ] && printf "{}" >"$POSITIONS"
chmod 0644 "$POSITIONS"

# start frontend
sed -i "s|{CONTAINER_NAME}|$CONTAINER_NAME|; s|{POSITIONS_DIR}|$POSDIR|; s|{POSITIONS_FILE}|$POSFILE|" /etc/nginx/http.d/default.conf
spawn-fcgi -f "/usr/bin/fcgiwrap -f" -s /tmp/fcgiwrap.sock -u fcgiwrap -U nginx
nginx

# modeswitch
if [ -n "$MODESWITCH_VENDOR" ] && [ -n "$MODESWITCH_PRODUCT" ]; then
    set --
    # shellcheck disable=SC2089
    [ -n "$MODESWITCH_MSG1" ] && set -- "$@" -M "$MODESWITCH_MSG1"
    [ -n "$MODESWITCH_MSG2" ] && set -- "$@" -2 "$MODESWITCH_MSG2"
    [ -n "$MODESWITCH_MSG3" ] && set -- "$@" -3 "$MODESWITCH_MSG3"
    [ -n "$MODESWITCH_TARGET_VENDOR" ] && set -- "$@" -V "$MODESWITCH_TARGET_VENDOR"
    [ -n "$MODESWITCH_TARGET_PRODUCT" ] && set -- "$@" -P "$MODESWITCH_TARGET_PRODUCT"
    # shellcheck disable=SC2086,SC2090
    usb_modeswitch -s 10 -v "$MODESWITCH_VENDOR" -p "$MODESWITCH_PRODUCT" "$@"
    set --
fi

# start backend
sed -i "s|{DEVICE}|$DEVICE|; s|{PIN}|$PIN|" /etc/smsd.conf
exec /usr/sbin/smsd
