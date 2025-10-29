# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# ติดตั้งเฉพาะ prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# คัดลอกผล build
COPY --from=builder /app/dist ./dist

# พอร์ต API
ENV PORT=3001
EXPOSE 3001

# Healthcheck ใช้ร่วมกับ compose (มี /api/health ในโค้ด)
CMD ["node", "dist/index.js"]
