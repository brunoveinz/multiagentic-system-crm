FROM node:22-slim

WORKDIR /app

# Instalar deps primero (capa cacheable). Sin lockfile aún -> npm install.
COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000
