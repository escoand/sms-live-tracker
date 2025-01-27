FROM alpine:3.21.2

RUN apk --no-cache add \
        bash=5.2.37-r0 \
        coreutils=9.5-r2 \
        fcgiwrap=1.1.0-r8 \
        jq=1.7.1-r0 \
        nginx=1.26.2-r4 \
        smstools=3.1.21-r4 \
        spawn-fcgi=1.6.5-r4 \
        usb-modeswitch=2.6.1-r4 && \
    addgroup smsd audio

COPY scripts/   /usr/local/bin/
COPY www/       /var/www/html/
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY smsd.conf  /etc/smsd.conf

VOLUME /data
ENV DEVICE         /dev/ttyUSB1
ENV POSITIONS      /data/positions.json

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]