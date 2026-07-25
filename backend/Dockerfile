FROM node:24-bookworm-slim

WORKDIR /app

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
