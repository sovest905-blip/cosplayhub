# Build context: монорепо root (cosplayhub/)
FROM node:22-alpine
WORKDIR /app

# Копируем workspace манифесты
COPY package.json ./
COPY shared/package.json ./shared/
COPY web/package.json ./web/

# Устанавливаем зависимости (workspaces)
RUN npm install

# Копируем исходники
COPY shared/ ./shared/
COPY web/ ./web/

WORKDIR /app/web
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
