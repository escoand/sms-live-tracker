# frontend
FROM docker.io/denoland/deno:alpine@sha256:46c1b2f84dd10d6aeea5156e74d9f130cf60b5ef699133d7116c28bea7f62ffe AS builder
WORKDIR /app
COPY deno.lock package.json .
COPY src                    src
COPY www                    www
RUN deno install && \
    deno task build

# runtime
FROM docker.io/denoland/deno:distroless@sha256:d2c280e46eb92bce226305c5f1fd0b1242b7bd6e917bdf84bb76b78813d11e05
WORKDIR /app
COPY package.json main.ts    .
COPY src                     src
COPY --from=builder /app/www www
RUN [ "deno", "install", "--entrypoint", "main.ts" ],
CMD [ "task", "start" ]

VOLUME /app/data
EXPOSE 8000