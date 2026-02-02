# frontend
FROM docker.io/denoland/deno:alpine@sha256:95296c50c47e3f63739e928980b968e273636c52e7f599c67ee831570b17deeb AS builder
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