# frontend
FROM docker.io/denoland/deno:latest AS builder
WORKDIR /app
COPY deno.lock package.json .
COPY src                    src
COPY www                    www
RUN deno install && \
    deno task build

# runtime
FROM reg.mini.dev/deno:2.9.4
WORKDIR /app
COPY package.json main.ts             .
COPY src                              src
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/www          www
CMD [ "task", "start" ]

VOLUME /app/data
EXPOSE 8000