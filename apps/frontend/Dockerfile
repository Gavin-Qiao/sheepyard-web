# Stage 1: Build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json .
RUN bun install
COPY . .
RUN bun run build

# Stage 2: Serve
FROM caddy:alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /usr/share/caddy
