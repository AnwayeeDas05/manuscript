FROM node:18-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set env variables at build time
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
