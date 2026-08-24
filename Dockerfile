FROM node:22-slim

# better-sqlite3 falls back to compiling from source if no prebuild matches
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/bookings.db
EXPOSE 3000
CMD ["node", "server.js"]
