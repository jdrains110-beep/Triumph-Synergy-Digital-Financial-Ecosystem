FROM node:22-alpine
WORKDIR /app
COPY server.js /app/server.js
ENV NODE_ENV=production PORT=8210
EXPOSE 8210
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8210/health >/dev/null 2>&1 || exit 1
USER node
CMD ["node", "/app/server.js"]
