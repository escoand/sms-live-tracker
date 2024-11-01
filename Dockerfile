FROM alpine:3.20.3 AS builder

COPY xdsopl /build
RUN apk --no-cache add gcc make musl-dev && \
    cd /build && \
    make all

FROM alpine:3.20.3

RUN apk --no-cache add \
        bash \
        coreutils \
        fcgiwrap \
        jq \
        ncurses \
        nginx \
        spawn-fcgi \
        usb-modeswitch && \
    addgroup fcgiwrap audio

COPY scripts/   /usr/local/bin/
COPY www/       /var/www/html/
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY --from=builder /build/ascii2gsm /build/gsm2ascii /usr/local/bin/

VOLUME /data
ENV POSITIONS /data/positions.json
ENV DEVICE    /dev/ttyUSB1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]