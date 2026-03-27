FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --include=dev

COPY backend/ ./

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
