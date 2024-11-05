#!/bin/sh -e

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

# start backend
sed -i "s|{DEVICE}|$DEVICE|; s|{PIN}|$PIN|" /etc/smsd.conf
usb_modeswitch -v 19d2 -p 0031 -s 10 || true
exec /usr/sbin/smsd
