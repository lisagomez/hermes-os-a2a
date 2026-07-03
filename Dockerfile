# Dockerfile — a2abot (Mission Control, Fase 4). Next.js standalone.
# Build lo lanza businessos/docker-compose.yml con context en la raiz del repo.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json next.config.ts tsconfig.json tailwind.config.ts postcss.config.js ./
COPY src ./src
# El build no necesita secretos: la fuente real se decide en runtime (env del compose)
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S a2abot && adduser -S a2abot -G a2abot
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER a2abot
EXPOSE 3000
CMD ["node", "server.js"]
