# Edge: Caddy con rate limiting (mholt/caddy-ratelimit no viene en la imagen
# oficial → build con xcaddy). TLS automatico (Let's Encrypt con fallback
# ZeroSSL). Es la UNICA pieza del stack que publica un puerto en 0.0.0.0.
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/mholt/caddy-ratelimit

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
