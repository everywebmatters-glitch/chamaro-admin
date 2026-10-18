FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# The API address is baked into the bundle at build time: refuse to build without it.
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "NEXT_PUBLIC_API_URL build argument is required" >&2; exit 1)
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/out ./out
COPY serve.json ./out/serve.json

EXPOSE 8080
CMD ["sh", "-c", "serve ./out -l tcp://0.0.0.0:${PORT:-8080}"]
