FROM alpine:3.20.3

RUN apk --no-cache add \
        coreutils \
        fcgiwrap \
        jq \
        nginx \
        spawn-fcgi \
        smstools \
        usb-modeswitch

COPY --chmod=0755 scripts/   /usr/local/bin/
COPY              www/       /var/www/html/
COPY              nginx.conf /etc/nginx/http.d/default.conf
COPY              smsd.conf  /etc/smsd.conf

VOLUME /var/spool/sms/
ENV POSITIONS /var/spool/sms/positions.json

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]