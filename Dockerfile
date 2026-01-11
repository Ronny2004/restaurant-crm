# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desabilitar telemetría de Next.js durante el build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Stage 3: Production image with Nginx
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy the static export from builder
COPY --from=builder /app/out ./

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
