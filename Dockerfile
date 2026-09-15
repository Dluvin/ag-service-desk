FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Render may inject DATABASE_URL (Postgres or a path without file:). This app uses SQLite.
ENV DATABASE_URL="file:/data/prod.db"
RUN DATABASE_URL="file:./build.db" npx prisma generate && DATABASE_URL="file:./build.db" npm run build

RUN mkdir -p /data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=file:/data/prod.db && npx prisma db push && npx next start -p ${PORT:-3000}"]
