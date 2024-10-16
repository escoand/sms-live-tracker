#!/bin/sh -e

POSDIR=${POSITIONS%/*}
POSFILE=${POSITIONS##*/}

# init env
chown -R fcgiwrap:www-data "$POSDIR"
chmod 2755 "$POSDIR"
chmod 0644 "$POSITIONS"

# start frontend
sed -i "s|{POSITIONS_DIR}|$POSDIR|; s|{POSITIONS_FILE}|$POSFILE|" /etc/nginx/http.d/default.conf
spawn-fcgi -f "/usr/bin/fcgiwrap -f" -s /tmp/fcgiwrap.sock -u fcgiwrap -U nginx
nginx

# start backend
usb_modeswitch -v 19d2 -p 0031 || true
while true; do
    receive.sh
    sleep 30
done
