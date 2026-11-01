FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY kokoro-provider.mjs ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 KOKORO_CACHE_DIR=/data/audio-cache
VOLUME ["/data"]
EXPOSE 8080
CMD ["node", "kokoro-provider.mjs"]
