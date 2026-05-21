# Olgax POS — Database Setup & Fixes

Dokumentasi semua masalah database yang ditemui saat deployment dan cara mengatasinya.

---

## Urutan Setup Database (Setelah Container Up)

### Step 1 — Jalankan Migration

```bash
docker exec -it olgax-pos-web-1 node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma
```

Output yang diharapkan:
```
5 migrations found in prisma/migrations
No pending migrations to apply.
```

---

### Step 2 — Fix Missing Columns (Bug di Repo)

Ada 7 kolom di `schema.prisma` yang **tidak ada di migration files** — harus di-ALTER manual ke database.

```bash
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

> **Kenapa ini terjadi?** Developer menambahkan kolom-kolom storage ke `schema.prisma` tapi lupa generate migration file-nya. Jadinya Prisma dan database tidak sinkron.

---

### Step 3 — Verifikasi Kolom

Pastikan semua kolom sudah ada:

```bash
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "\d \"BusinessSettings\""
```

Kolom yang harus ada di output:

| Kolom | Type | Nullable |
|---|---|---|
| storageProvider | text | not null |
| storageRegion | text | nullable |
| storageBucket | text | nullable |
| storageEndpoint | text | nullable |
| storageAccessKey | text | nullable |
| storageSecretKey | text | nullable |
| storagePublicUrl | text | nullable |

---

## Error Referensi & Solusinya

### Error 1 — `The column 'storageProvider' does not exist`

```
Invalid `prisma.businessSettings.upsert()` invocation:
The column `storageProvider` does not exist in the current database.
```

**Penyebab:** Kolom ada di schema tapi tidak ada di migration files.

**Fix:** Jalankan Step 2 di atas (ALTER TABLE).

---

### Error 2 — `The column '(not available)' does not exist`

```
Invalid `prisma.businessSettings.upsert()` invocation:
The column `(not available)` does not exist in the current database.
```

**Penyebab:** Masih ada kolom storage lain yang belum di-ALTER (muncul setelah fix storageProvider saja).

**Fix:** Pastikan semua 7 kolom di-ALTER sekaligus seperti di Step 2 — jangan satu per satu.

---

### Error 3 — Setup Wizard Tidak Muncul Lagi

**Penyebab:** Flag `setupComplete` sudah `true` di database, tapi akun admin terlanjur terhapus atau setup belum selesai.

**Fix:**

```bash
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "
UPDATE \"BusinessSettings\" SET \"setupComplete\" = false WHERE id = 'singleton';
"
```

Jika masih tidak muncul setelah refresh, kemungkinan **cache browser** menyimpan session lama. Coba buka di browser lain atau incognito.

---

### Error 4 — Tidak Bisa Login Setelah Akun Terhapus

**Penyebab:** Row di tabel `User` terhapus tapi data di tabel `Session`, `Account`, `Verification` masih ada — app menganggap user masih login.

**Fix — Reset semua data auth:**

```bash
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "
TRUNCATE \"Session\", \"Account\", \"Verification\", \"User\" CASCADE;
UPDATE \"BusinessSettings\" SET \"setupComplete\" = false WHERE id = 'singleton';
"
```

Lalu buka setup wizard lagi untuk buat akun admin baru.

---

## Operasi Database Umum

### Lihat semua tabel
```bash
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "\dt"
```

### Lihat isi tabel User
```bash
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "SELECT id, email, name FROM \"User\";"
```

### Reset database total (hati-hati, semua data hilang)
```bash
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos -c "
DROP SCHEMA public CASCADE; 
CREATE SCHEMA public;
"
# Lalu migrate ulang
docker exec -it olgax-pos-web-1 node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma
# Lalu fix kolom lagi (Step 2)
```

### Masuk ke psql shell interaktif
```bash
docker exec -it olgax-pos-postgres-1 psql -U postgres -d olgax_pos
```

---

## Catatan Untuk Versi Selanjutnya

Jika repo di-fork dan dikembangkan lebih lanjut, **buat migration file** untuk kolom-kolom storage agar tidak perlu ALTER manual lagi:

```bash
# Di local dev environment
pnpm prisma migrate dev --name add_storage_columns
```

Ini akan generate file di `prisma/migrations/` yang otomatis ter-apply saat `migrate deploy` di production.
