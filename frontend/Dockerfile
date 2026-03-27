FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci --include=dev

COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "serve -s dist -l tcp://${HOST}:${PORT}"]
