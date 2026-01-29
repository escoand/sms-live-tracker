# frontend
FROM docker.io/denoland/deno:alpine@sha256:454b4d685f9e8f35e41f838aa5ca297769f4ee18ee0f4814329b51af2c4c9e7c AS builder
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