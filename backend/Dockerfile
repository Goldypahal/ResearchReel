FROM node:20-slim

# Install system dependencies, including ffmpeg for video transcoding
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Create directory structure for uploads
RUN mkdir -p public/uploads/staging public/uploads/processed

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "src/server.js"]
