FROM alpine:3.21.1

RUN apk --no-cache add \
        bash \
        coreutils \
        fcgiwrap \
        jq \
        nginx \
        smstools \
        spawn-fcgi \
        usb-modeswitch && \
    addgroup smsd audio

COPY scripts/   /usr/local/bin/
COPY www/       /var/www/html/
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY smsd.conf  /etc/smsd.conf

VOLUME /data
ENV CONTAINER_NAME tracker
ENV DEVICE         /dev/ttyUSB1
ENV POSITIONS      /data/positions.json

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]