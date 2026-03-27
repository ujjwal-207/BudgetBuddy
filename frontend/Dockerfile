FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
ENV NPM_CONFIG_OMIT=

COPY frontend/package*.json ./
RUN npm config set production false \
 && npm config set omit "" \
 && npm install --include=dev \
 && npm ls vite

COPY frontend/ ./

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host"]
