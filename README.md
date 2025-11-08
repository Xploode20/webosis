# Web OSIS — Minimalis & Kekinian

Proyek website OSIS dengan profil OSIS, pengurus, pembina, fitur posting kegiatan, dan formulir saran/laporan.

## Fitur
- Profil OSIS (nama, deskripsi, misi)
- Profil Pengurus (grid kartu)
- Profil Pembina
- Posting kegiatan (buat & tampilkan)
- Formulir saran/laporan

## Menjalankan Lokal
1. Install dependency:
   ```bash
   npm install
   ```
2. Jalankan server:
   ```bash
   # Atur password admin (opsional, default: admin123)
   ADMIN_SECRET="admin123" npm run dev
   ```
3. Buka `http://localhost:3000`.
   - Halaman admin: `http://localhost:3000/admin.html`

## Struktur Direktori
```
public/           # aset frontend (HTML, CSS, JS)
  index.html
  styles.css
  app.js
  admin.html
  admin.js

data/             # database & data awal
  posts.json
  reports.json
  profiles.json
  articles.json
  webosis.db      # SQLite database

server.js         # server Express + REST API
package.json
```

## API Ringkas
- GET `/api/profiles` → data profil OSIS, pengurus, pembina
- GET `/api/posts` → daftar posting terbaru
- POST `/api/posts` → buat posting `{ title, content, author }`
- GET `/api/reports` → daftar saran/laporan
- POST `/api/reports` → kirim saran/laporan `{ name?, contact?, type, message }`
- GET `/api/articles` → daftar artikel
- POST `/api/articles` → tambah artikel `{ title, content, author }`

Admin (butuh header `x-admin-token: <ADMIN_SECRET>`):
- GET `/api/admin/pengurus`
- POST `/api/admin/pengurus` `{ name, role, photoUrl? }`
- DELETE `/api/admin/pengurus/:id`
- GET `/api/admin/settings` (osis, pembina, mission)
- PUT `/api/admin/settings` `{ osis?, pembina?, mission? }`
- DELETE `/api/admin/posts/:id`
- DELETE `/api/admin/articles/:id`

Catatan keamanan: Untuk produksi, ganti token sederhana ke autentikasi yang lebih kuat (login/JWT + HTTPS).

## Kustomisasi
- Ubah konten default di `data/profiles.json`
- Edit gaya di `public/styles.css`
- Sesuaikan logika tampilan di `public/app.js`

## Lisensi
MIT


