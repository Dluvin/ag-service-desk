FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/prod.db
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npx next start -p ${PORT:-3000}"]
