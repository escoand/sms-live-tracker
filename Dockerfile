# frontend
FROM docker.io/denoland/deno:alpine@sha256:774694967decb96ff808f9554c3c3ae4c1ea1d806e17e730f68fa6b2bbf3cc66 AS builder
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