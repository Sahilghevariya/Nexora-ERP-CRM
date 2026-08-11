# --- Stage 1: Build static distribution ---
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set relative path so Nginx reverse proxies request transparently without CORS blocks
ENV VITE_API_URL=/api/v1
RUN npm run build

# --- Stage 2: Serve using Nginx ---
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
