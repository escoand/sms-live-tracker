# frontend
FROM docker.io/denoland/deno:alpine AS builder
WORKDIR /app
COPY deno* build.js .
COPY src               src
COPY www               www
RUN deno install && \
    deno task build

# runtime
FROM docker.io/denoland/deno:distroless
WORKDIR /app
COPY deno.json main.ts       .
COPY src                     src
COPY --from=builder /app/www www
RUN [ "deno", "install", "--entrypoint", "main.ts" ],
CMD [ "task", "start" ]

VOLUME /app/data
EXPOSE 3000