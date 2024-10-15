#!/bin/sh -e

POSDIR=${POSITIONS%/*}
POSFILE=${POSITIONS##*/}

# init env
mkdir -p /var/spool/sms/checked \
    /var/spool/sms/incoming \
    /var/spool/sms/outgoing \
    "$POSDIR"
touch "$POSITIONS"
chmod 0644 "$POSITIONS"

# start frontend
sed -i "s|{POSITIONS_DIR}|$POSDIR|; s|{POSITIONS_FILE}|$POSFILE|" /etc/nginx/http.d/default.conf
spawn-fcgi -f /usr/bin/fcgiwrap -s /run/fcgiwrap.sock -u nobody -g nobody
nginx

# switch to modem mode
usb_modeswitch -v 19d2 -p 0031 || true

# start backend
sed -i "s|{PIN}|$PIN|" /etc/smsd.conf
exec /usr/sbin/smsd
