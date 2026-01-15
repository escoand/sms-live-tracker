# frontend
FROM docker.io/denoland/deno:alpine@sha256:b352e01d7dfb6d5d3ca83413ce5a8149f13b1a0041457ce2ae5856e100d00ff8 AS builder
WORKDIR /app
COPY deno.lock package.json .
COPY src                    src
COPY www                    www
RUN deno install && \
    deno task build

# runtime
FROM docker.io/denoland/deno:distroless@sha256:9c76b672638b3996186a20523db5dca6854e9e7e9be6e8eba74c82f766378c2c
WORKDIR /app
COPY package.json main.ts    .
COPY src                     src
COPY --from=builder /app/www www
RUN [ "deno", "install", "--entrypoint", "main.ts" ],
CMD [ "task", "start" ]

VOLUME /app/data
EXPOSE 8000