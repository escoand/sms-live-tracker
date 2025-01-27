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
if [ -n "$MODESWITCH_VENDOR" ] && [ -n "$MODESWITCH_PRODUCT" ] && [ -n "$MODESWITCH_MSG1" ] && [ -n "$MODESWITCH_MSG2" ]; then
    usb_modeswitch -v "$MODESWITCH_VENDOR" -p "$MODESWITCH_PRODUCT" -M "$MODESWITCH_MSG1" -2 "$MODESWITCH_MSG2"
elif [ -n "$MODESWITCH_VENDOR" ] && [ -n "$MODESWITCH_PRODUCT" ] && [ -n "$MODESWITCH_MSG1" ]; then
    usb_modeswitch -v "$MODESWITCH_VENDOR" -p "$MODESWITCH_PRODUCT" -M "$MODESWITCH_MSG1"
elif [ -n "$MODESWITCH_VENDOR" ] && [ -n "$MODESWITCH_PRODUCT" ]; then
    usb_modeswitch -v "$MODESWITCH_VENDOR" -p "$MODESWITCH_PRODUCT"
fi

# start backend
sed -i "s|{DEVICE}|$DEVICE|; s|{PIN}|$PIN|" /etc/smsd.conf
exec /usr/sbin/smsd
