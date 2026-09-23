FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Render may inject DATABASE_URL (Postgres or a path without file:). This app uses SQLite.
ENV DATABASE_URL="file:/data/prod.db"
ARG RENDER_GIT_COMMIT
RUN DATABASE_URL="file:./build.db" npx prisma generate \
  && DATABASE_URL="file:./build.db" npx prisma db push \
  && DATABASE_URL="file:./build.db" NEXT_DEPLOYMENT_ID="${RENDER_GIT_COMMIT:-$(date -u +%Y%m%d%H%M%S)}" npm run build

RUN mkdir -p /data /data/uploads

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=file:/data/prod.db && npx prisma db push && npx next start -p ${PORT:-3000}"]
