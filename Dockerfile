# frontend
FROM docker.io/denoland/deno:alpine@sha256:13851184d6705150b8b230c5377f26c3bd182865d28700bb72bc0b2c271b504a AS builder
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