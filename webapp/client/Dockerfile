# ---------- Build frontend ----------
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_USE_SHEETS=false
ENV VITE_USE_SHEETS=${VITE_USE_SHEETS}
COPY package*.json ./
RUN npm ci
COPY . .
# สร้างไฟล์ env ให้ Vite
RUN echo "VITE_USE_SHEETS=${VITE_USE_SHEETS}" > .env.production
RUN npm run build

# ---------- Nginx serve ----------
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist ./
# Nginx conf รองรับ history fallback + reverse proxy /api --> api:3001
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
