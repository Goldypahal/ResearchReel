FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Where the Next server proxies /api and /uploads (compiled into the build).
ARG BACKEND_URL=http://api-gateway:5000
# Optional: public API URL for direct large uploads; empty = upload through this server.
ARG NEXT_PUBLIC_UPLOAD_URL=
ARG NEXT_PUBLIC_SUPPORT_EMAIL=
ENV BACKEND_URL=$BACKEND_URL NEXT_PUBLIC_UPLOAD_URL=$NEXT_PUBLIC_UPLOAD_URL NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
USER node
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
