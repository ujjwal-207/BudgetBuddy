FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false

COPY frontend/package*.json ./
RUN npm install --include=dev

COPY frontend/ ./

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host"]
