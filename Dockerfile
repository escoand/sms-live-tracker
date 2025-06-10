# frontend
FROM docker.io/library/node:alpine AS builder
WORKDIR /app
COPY package* build.js .
COPY src               src
COPY www               www
RUN npm ci && \
    npm run build

# runtime
FROM docker.io/denoland/deno:distroless
WORKDIR /app
COPY deno.json main.ts       .
COPY src                     src
COPY --from=builder /app/www www
RUN [ "deno", "cache", "main.ts" ],
CMD [ "task", "start" ]

VOLUME /app/data
EXPOSE 3000