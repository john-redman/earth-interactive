# EarthInteractive API, self-hosted: Node 22 + SQLite (node:sqlite), no npm packages.
# Build context is the REPO ROOT, because src/profanity.js re-exports js/net/profanity.js:
#   docker build -f server/deploy/Dockerfile -t earth-api .
# docker-compose.yml in this folder does that for you.
FROM node:22-alpine

ENV NODE_ENV=production \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning \
    HOST=0.0.0.0 \
    PORT=8787 \
    DB_PATH=/data/earth.db

WORKDIR /app
COPY js/net/profanity.js js/net/profanity.js
COPY server/package.json server/schema.sql server/
COPY server/src server/src
COPY server/node server/node

# The database lives on a volume; the app runs as the image's unprivileged `node` user (uid 1000).
RUN mkdir -p /data && chown node:node /data
USER node
WORKDIR /app/server
VOLUME ["/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/api/health >/dev/null || exit 1

# exec form, so SIGTERM from `docker stop` reaches node directly (graceful shutdown, WAL checkpoint)
CMD ["node", "node/server.mjs"]
