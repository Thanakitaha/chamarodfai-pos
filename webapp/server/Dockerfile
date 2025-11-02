# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm install --legacy-peer-deps; else npm install --no-package-lock --legacy-peer-deps; fi
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache postgresql16-client bash curl wget

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 3001

# Healthcheck ใช้ร่วมกับ compose (มี /api/health ในโค้ด)
CMD ["node", "dist/index.js"]
