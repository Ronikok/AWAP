# syntax=docker/dockerfile:1
FROM node:22-slim

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/backend.js ./

EXPOSE 8000
CMD ["npm", "start"]
