FROM node:22-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código (incluyendo prisma schema y configuración de Prisma)
COPY . .

# Generar cliente prisma (usa prisma.config.ts automáticamente)
RUN npx prisma generate

# Compilar la aplicación
RUN npm run build

# --- Stage de Producción ---
FROM node:22-alpine

# Instalar wget para el healthcheck
RUN apk add --no-cache wget

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# Script para ejecutar migraciones y luego iniciar la app
# Se usa migrate deploy para producción. Si no hay migraciones, avisamos.
CMD ["sh", "-c", "if [ -d \"prisma/migrations\" ]; then npx prisma migrate deploy; else echo '⚠️ No se encontraron migraciones. Ejecute npx prisma migrate dev localmente primero.'; fi && npm run start:prod"]
