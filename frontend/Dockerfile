FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NEXT_PUBLIC_API_URL=http://localhost:5000/api
ENV NEXT_PUBLIC_WSS_URL=ws://localhost:5000

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
