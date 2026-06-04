# Build context: монорепо root (cosplayhub/)
FROM node:22-alpine
WORKDIR /app

COPY package.json ./
COPY shared/package.json ./shared/
COPY web/package.json ./web/

RUN npm install

COPY shared/ ./shared/
COPY web/ ./web/

WORKDIR /app/web

# NEXT_PUBLIC_* запекаются при сборке — передаём как ARG
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
