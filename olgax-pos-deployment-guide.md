# Olgax POS — Deployment Guide (VPS)

Setup ini sudah teruji di **Ubuntu 24.04 LTS**, Nginx, Cloudflare, Docker.

---

## Prerequisites

- VPS dengan Ubuntu 24.04 LTS
- Docker & Docker Compose sudah terinstall
- Nginx & Certbot sudah terinstall
- Domain sudah terhubung ke Cloudflare

---

## 1. Clone & Transfer ke VPS

Clone di lokal terlebih dahulu:

```bash
git clone https://github.com/OLGAX-com/olgax-pos.git
cd olgax-pos
```

Transfer ke VPS via rsync (exclude folder yang tidak perlu):

```bash
rsync -avz -e "ssh -p PORT_SSH" --exclude 'node_modules' --exclude '.next' ./olgax-pos/ user@IP_VPS:~/olgax-pos/
```

---

## 2. Fix Dockerfile

Dockerfile original bermasalah — ganti seluruh isinya dengan versi berikut:

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile --ignore-workspace

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./prisma.config.ts
COPY . .
RUN pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

---

## 3. Fix .dockerignore

Tambahkan `pnpm-workspace.yaml` ke `.dockerignore` agar tidak ikut ter-copy ke builder stage:

```bash
echo "pnpm-workspace.yaml" >> .dockerignore
```

---

## 4. Update docker-compose.yml

Edit `docker-compose.yml` — hapus expose port 5432 ke host (hindari konflik dengan postgres container lain), dan sesuaikan environment:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password   # ganti dengan password kuat
      POSTGRES_DB: olgax_pos
    # ports: JANGAN di-expose ke host
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
  web:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://postgres:password@postgres:5432/olgax_pos?schema=public"
      BETTER_AUTH_SECRET: "${BETTER_AUTH_SECRET}"
      NEXT_PUBLIC_APP_URL: "${NEXT_PUBLIC_APP_URL}"
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
volumes:
  postgres_data:
```

---

## 5. Update .env

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/olgax_pos"
BETTER_AUTH_SECRET="isi_dengan_random_string_panjang"  # openssl rand -base64 48
BETTER_AUTH_URL="https://pos.domain.com"
NEXT_PUBLIC_APP_URL="https://pos.domain.com"
BETTER_AUTH_TRUSTED_ORIGINS="https://pos.domain.com"
NODE_ENV="production"
NEXT_STANDALONE="1"
```

Generate secret baru:
```bash
openssl rand -base64 48
```

---

## 6. Build & Jalankan

```bash
cd ~/olgax-pos
docker compose up -d --build
```

Cek container berjalan:
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## 7. Fix Missing Database Columns (Schema Bug)

Ada bug di repo — beberapa kolom `BusinessSettings` tidak ada di migration files. Jalankan setelah container up:

```bash
# Tambah kolom storageProvider
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "
ALTER TABLE \"BusinessSettings\" 
ADD COLUMN IF NOT EXISTS \"storageProvider\" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN IF NOT EXISTS \"storageRegion\" TEXT,
ADD COLUMN IF NOT EXISTS \"storageBucket\" TEXT,
ADD COLUMN IF NOT EXISTS \"storageEndpoint\" TEXT,
ADD COLUMN IF NOT EXISTS \"storageAccessKey\" TEXT,
ADD COLUMN IF NOT EXISTS \"storageSecretKey\" TEXT,
ADD COLUMN IF NOT EXISTS \"storagePublicUrl\" TEXT;
"
```

---

## 8. Setup Nginx

```bash
sudo nano /etc/nginx/sites-available/pos.domain.com
```

Isi:

```nginx
server {
    listen 80;
    server_name pos.domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable dan reload:

```bash
sudo ln -s /etc/nginx/sites-available/pos.domain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9. DNS di Cloudflare

Tambahkan record:
- **Type**: A
- **Name**: `pos`
- **IPv4**: IP VPS
- **Proxy**: OFF dulu (grey cloud)

---

## 10. SSL dengan Certbot

```bash
sudo certbot --nginx -d pos.domain.com
```

Setelah SSL aktif, nyalakan proxy Cloudflare (orange cloud).

---

## 11. Setup Wizard

Buka `https://pos.domain.com` di browser — ikuti setup wizard untuk membuat akun admin.

> **Catatan:** Jika setup wizard tidak muncul padahal belum setup, reset flag-nya:
> ```bash
> docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "UPDATE \"BusinessSettings\" SET \"setupComplete\" = false WHERE id = 'singleton';"
> ```

---

## Troubleshooting

### Reset akun admin
```bash
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "
TRUNCATE \"Session\", \"Account\", \"Verification\", \"User\" CASCADE;
UPDATE \"BusinessSettings\" SET \"setupComplete\" = false WHERE id = 'singleton';
"
```

### Lihat logs
```bash
docker compose logs -f web
```

### Restart app
```bash
docker compose restart web
```
