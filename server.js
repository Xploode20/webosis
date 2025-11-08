import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import axios from 'axios';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-me';
const SALT_ROUNDS = 10;

// --- Kredensial Bot Telegram ---
const TELEGRAM_BOT_TOKEN = '8397715818:AAHdOrf2r12xpLjOvLHKXCUCgtAHURRsZFE'; // <-- GANTI INI
const TELEGRAM_CHAT_ID = '-1003296441810';   // <-- GANTI INI

// Resolve __dirname for ES modules
const __dirnameResolved = path.resolve();
const publicDir = path.join(__dirnameResolved, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
const dataDir = path.join(__dirnameResolved, 'data');
const dbFile = path.join(dataDir, 'webosis.db');

// Ensure data directory and files exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ensureFile = (filePath, defaultContent) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
  }
};

const postsFile = path.join(dataDir, 'posts.json');
const reportsFile = path.join(dataDir, 'reports.json');
const profilesFile = path.join(dataDir, 'profiles.json');
const articlesFile = path.join(dataDir, 'articles.json');

ensureFile(postsFile, []);
ensureFile(reportsFile, []);
ensureFile(profilesFile, {
  osis: {
    name: 'OSIS SMA Negeri Contoh',
    description:
      'Organisasi Siswa Intra Sekolah yang menjadi wadah aspirasi dan pengembangan potensi siswa untuk berkarya dan berdampak.',
    mission: [
      'Membangun karakter kepemimpinan dan kolaborasi',
      'Menyelenggarakan kegiatan positif dan kreatif',
      'Menjadi jembatan komunikasi siswa dan sekolah'
    ]
  },
  pengurus: [
    { name: 'Alya Pratama', role: 'Ketua OSIS', photoUrl: '' },
    { name: 'Raka Saputra', role: 'Wakil Ketua', photoUrl: '' },
    { name: 'Nadia Putri', role: 'Sekretaris', photoUrl: '' },
    { name: 'Dimas Ardi', role: 'Bendahara', photoUrl: '' }
  ],
  pembina: {
    name: 'Ibu Siti Rahma, S.Pd',
    description:
      'Pembina OSIS yang membimbing perencanaan program, pengembangan karakter, dan tata kelola organisasi.',
    photoUrl: ''
  }
});
ensureFile(articlesFile, []);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadsDir)); // Serve uploaded files
app.use(express.static(publicDir));

// Helpers
const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw || 'null');
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Admin guard
const requireAdmin = (req, res, next) => {
  const authHeader = req.header('x-admin-token');
  if (!authHeader) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ada.' });
  }
  try {
    jwt.verify(authHeader, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token tidak valid.' });
  }
};

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// --- SQLite setup ---
const db = new Database(dbFile);
db.pragma('journal_mode = wal');

// Define all table creation statements (excluding CREATE TABLE IF NOT EXISTS)
const tableSchemas = {
  agendas: `(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT,
    description TEXT NOT NULL
  )`,
  reports: `(
    id TEXT PRIMARY KEY,
    name TEXT,
    contact TEXT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`,
  articles: `(
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    thumbnailUrl TEXT
  )`,
  pengurus: `(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    photoUrl TEXT,
    createdAt TEXT
  )`,
  settings: `(
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  pembina: `(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    photoUrl TEXT,
    createdAt TEXT
  )`,
  gallery: `(
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    caption TEXT,
    createdAt TEXT NOT NULL
  )`,
  admins: `(
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )`
};

// Initial table creation for all tables (IF NOT EXISTS)
for (const tableName in tableSchemas) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} ${tableSchemas[tableName]}`);
}

// Explicitly check and fix 'settings' table schema if it's outdated
const settingsTableInfo = db.prepare("PRAGMA table_info(settings)").all();
const hasKeyColumn = settingsTableInfo.some(col => col.name === 'key');
const hasValueColumn = settingsTableInfo.some(col => col.name === 'value');

if (!hasKeyColumn || !hasValueColumn) {
  console.warn('Detected outdated "settings" table schema (missing key or value column). Dropping and recreating table.');
  db.exec('DROP TABLE IF EXISTS settings');
  db.exec(`CREATE TABLE settings ${tableSchemas.settings}`); // Recreate with correct schema
}

// Explicitly check and fix 'pembina' table schema if it's outdated
const pembinaTableInfo = db.prepare("PRAGMA table_info(pembina)").all();
const hasRoleColumn = pembinaTableInfo.some(col => col.name === 'role');
const hasDescriptionColumn = pembinaTableInfo.some(col => col.name === 'description'); // Check for old column

if (!hasRoleColumn || hasDescriptionColumn) { // If no 'role' or still has 'description'
  console.warn('Detected outdated "pembina" table schema (missing role column or still has description). Dropping and recreating table.');
  db.exec('DROP TABLE IF EXISTS pembina');
  db.exec(`CREATE TABLE pembina ${tableSchemas.pembina}`); // Recreate with correct schema
}

// Add createdAt column to pengurus and pembina if it doesn't exist (safer migration)
const pengurusInfo = db.prepare("PRAGMA table_info(pengurus)").all();
if (!pengurusInfo.some(col => col.name === 'createdAt')) {
  console.log('Menambahkan kolom createdAt ke tabel pengurus...');
  db.exec('ALTER TABLE pengurus ADD COLUMN createdAt TEXT');
}

const pembinaInfo = db.prepare("PRAGMA table_info(pembina)").all();
if (!pembinaInfo.some(col => col.name === 'createdAt')) {
  console.log('Menambahkan kolom createdAt ke tabel pembina...');
  db.exec('ALTER TABLE pembina ADD COLUMN createdAt TEXT');
}


// First-run migration from JSON files to DB (idempotent)
const countArticles = db.prepare('SELECT COUNT(1) as c FROM articles').get();
if (countArticles.c === 0) {
  try {
    const articles = readJson(articlesFile);
    const insert = db.prepare('INSERT INTO articles (id, title, content, author, createdAt) VALUES (@id, @title, @content, @author, @createdAt)'); // eslint-disable-line no-shadow
    const tx = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
    tx(articles.map((a) => ({ ...a, id: a.id || 'article_' + Date.now() })));
  } catch {}
}
const countReports = db.prepare('SELECT COUNT(1) as c FROM reports').get();
if (countReports.c === 0) {
  try {
    const reports = readJson(reportsFile);
    const insert = db.prepare('INSERT INTO reports (id, name, contact, type, message, createdAt) VALUES (@id, @name, @contact, @type, @message, @createdAt)');
    const tx = db.transaction((rows) => rows.forEach((r) => insert.run(r))); // eslint-disable-line no-shadow
    tx(reports.map((r) => ({ ...r, id: r.id || 'report_' + Date.now() })));
  } catch {}
}

// Pengurus migration
const countPengurus = db.prepare('SELECT COUNT(1) as c FROM pengurus').get(); // eslint-disable-line no-shadow
if (countPengurus.c === 0) { // eslint-disable-line no-shadow
  try {
    const profiles = readJson(profilesFile);
    const insert = db.prepare('INSERT INTO pengurus (id, name, role, photoUrl) VALUES (@id, @name, @role, @photoUrl)');
    const tx = db.transaction((rows) => rows.forEach((r) => insert.run(r))); // eslint-disable-line no-shadow
    tx((profiles.pengurus || []).map((m) => ({ id: 'pengurus_' + Date.now() + Math.random().toString(16).slice(2), ...m })));
  } catch {}
}

// Settings migration (always run if settings table was recreated or if keys are missing)
const osisSettingExists = db.prepare("SELECT COUNT(1) as c FROM settings WHERE key='osis'").get().c > 0;
const missionSettingExists = db.prepare("SELECT COUNT(1) as c FROM settings WHERE key='mission'").get().c > 0;

if (!osisSettingExists || !missionSettingExists) {
  try {
    const profiles = readJson(profilesFile);
    const set = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    set.run('osis', JSON.stringify(profiles.osis || {}));
    set.run('mission', JSON.stringify((profiles.osis && profiles.osis.mission) || []));
    console.log('Settings re-seeded from profiles.json.');
  } catch (e) { console.error("Error re-seeding settings:", e.message); }
}

// Seed default pembina if empty
const countPembina = db.prepare('SELECT COUNT(1) as c FROM pembina').get();
if (countPembina.c === 0) {
  const defaults = [
    { name: 'Ibu Siti Rahma, S.Pd', role: 'Pembina OSIS bidang organisasi & karakter', photoUrl: '' },
    { name: 'Bapak Andi Nugraha, M.Pd', role: 'Pembina OSIS bidang akademik & literasi', photoUrl: '' },
    { name: 'Ibu Diah Kartika, S.Pd', role: 'Pembina OSIS bidang seni & budaya', photoUrl: '' }
  ];
  const ins = db.prepare('INSERT INTO pembina (id, name, role, photoUrl) VALUES (?, ?, ?, ?)');
  const tx = db.transaction((rows) => rows.forEach((r) => ins.run('pembina_' + Date.now() + Math.random().toString(16).slice(2), r.name, r.role, r.photoUrl))); // eslint-disable-line no-shadow
  tx(defaults);
}

// Migrate single pembina from profiles.json if not already migrated (this was inside countPengurus === 0 block)
const profiles = readJson(profilesFile); // Re-read profiles.json
const pb = profiles.pembina ? [profiles.pembina] : [];
if (pb.length && db.prepare('SELECT COUNT(1) as c FROM pembina WHERE name = ?').get(pb[0].name).c === 0) { // eslint-disable-line no-shadow
  const insPb = db.prepare('INSERT INTO pembina (id, name, role, photoUrl) VALUES (@id, @name, @role, @photoUrl)');
  const txPb = db.transaction((rows) => rows.forEach((r) => insPb.run(r)));
  txPb(pb.map((b) => ({ id: 'pembina_' + Date.now() + Math.random().toString(16).slice(2), name: b.name, role: b.description || '', photoUrl: b.photoUrl || '' })));
}

// Seed default admin user if table is empty
const countAdmins = db.prepare('SELECT COUNT(1) as c FROM admins').get();
if (countAdmins.c === 0) {
  const defaultEmail = 'admin@osis.com';
  const defaultPassword = 'password123';
  bcrypt.hash(defaultPassword, SALT_ROUNDS, (err, hash) => {
    if (err) {
      console.error('Gagal melakukan hash password default:', err);
    } else {
      db.prepare('INSERT INTO admins (id, email, password) VALUES (?, ?, ?)').run('admin_default', defaultEmail, hash);
      console.log(`\n--- Admin Default Dibuat ---\nEmail: ${defaultEmail}\nPassword: ${defaultPassword}\n--------------------------\n`);
    }
  });
}

// --- Public API (DB-backed) ---
app.get('/api/profiles', (req, res) => {
  try {
    const osis = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='osis'").get()?.value || '{}');
    const mission = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='mission'").get()?.value || '[]');
    const pengurus = db.prepare('SELECT id, name, role, photoUrl FROM pengurus ORDER BY createdAt ASC').all();
    const pembina = db.prepare('SELECT id, name, role, photoUrl FROM pembina ORDER BY createdAt ASC').all();
    res.json({ osis: { ...osis, mission }, pengurus, pembina });
  } catch (err) {
    res.status(500).json({ message: 'Gagal membaca data profil' });
  }
});

app.get('/api/agendas', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, startDate, endDate, description FROM agendas ORDER BY startDate ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Gagal membaca agenda' });
  }
});

app.post('/api/agendas', requireAdmin, (req, res) => {
  try {
    const { name, startDate, endDate, description } = req.body || {};
    if (!name || !startDate) {
      return res.status(400).json({ message: 'Nama kegiatan dan tanggal mulai wajib diisi' });
    }
    const id = 'agenda_' + Date.now();
    db.prepare('INSERT INTO agendas (id, name, startDate, endDate, description) VALUES (?, ?, ?, ?, ?)')
      .run(id, String(name).trim(), String(startDate).trim(), (endDate || null), (description || '').trim());
    res.status(201).json({ id, name, startDate, endDate, description });
  } catch (err) {
    res.status(500).json({ message: 'Gagal menyimpan posting' });
  }
});

app.get('/api/reports', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, contact, type, message, createdAt FROM reports ORDER BY datetime(createdAt) DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Gagal membaca laporan' });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { name, contact, message, type } = req.body || {};
    if (!message) {
      return res.status(400).json({ message: 'Pesan laporan/saran wajib diisi' });
    }

    // Format pesan untuk Telegram
    const telegramMessage = `
🔔 *Laporan/Saran Baru* 🔔
-----------------------------------
*Tipe:* ${type === 'saran' ? 'Saran' : 'Laporan'}
*Dari:* ${name || 'Anonim'}
*Kontak:* ${contact || 'Tidak ada'}
-----------------------------------
*Pesan:*
${message}
    `.trim();

    // Kirim pesan menggunakan Telegram Bot API
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(telegramApiUrl, {
      chat_id: TELEGRAM_CHAT_ID,
      text: telegramMessage,
      parse_mode: 'Markdown'
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Gagal mengirim ke Telegram:', err.response ? err.response.data : err.message);
    res.status(500).json({ message: 'Gagal mengirim pesan ke Telegram' });
  }
});

// Articles (public)
app.get('/api/articles', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, title, content, author, createdAt, thumbnailUrl FROM articles ORDER BY datetime(createdAt) DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Gagal membaca artikel' });
  }
});

app.get('/api/articles/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: 'Gagal membaca artikel' });
  }
});

// Rute khusus untuk merender halaman artikel dengan meta tag Open Graph (untuk share)
app.get('/artikel.html', (req, res) => {
  const articleId = req.query.id;
  if (!articleId) {
    // Jika tidak ada ID, kirim file statis seperti biasa
    return res.sendFile(path.join(publicDir, 'artikel.html'));
  }

  try {
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId);
    if (!article) {
      return res.status(404).send('Artikel tidak ditemukan');
    }

    // Baca template HTML
    const templatePath = path.join(publicDir, 'artikel.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Buat deskripsi singkat untuk meta tag
    const description = article.content.length > 150 ? article.content.substring(0, 150) + '...' : article.content;
    const fullImageUrl = `http://${req.headers.host}${article.thumbnailUrl}`;

    // Ganti placeholder dengan data artikel
    html = html.replace(/__OG_TITLE__/g, article.title.replace(/"/g, '&quot;'))
               .replace(/__OG_DESCRIPTION__/g, description.replace(/"/g, '&quot;'))
               .replace(/__OG_IMAGE__/g, fullImageUrl);

    res.send(html);
  } catch (err) {
    res.status(500).send('Terjadi kesalahan pada server');
  }
});

app.post('/api/articles', requireAdmin, upload.single('thumbnail'), (req, res) => {
  try {
    const { title, content, author } = req.body || {};
    if (!title || !content || !author) {
      return res.status(400).json({ message: 'Judul, konten, dan penulis wajib diisi' });
    }
    const id = 'article_' + Date.now();
    const createdAt = new Date().toISOString();
    const thumbnailUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.thumbnailUrl || '');
    db.prepare('INSERT INTO articles (id, title, content, author, createdAt, thumbnailUrl) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, String(title).trim(), String(content).trim(), String(author).trim(), createdAt, thumbnailUrl);
    res.status(201).json({ id, title, content, author, createdAt, thumbnailUrl });
  } catch (err) {
    res.status(500).json({ message: 'Gagal menyimpan artikel' });
  }
});

// --- Admin API (protected) ---

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin) {
    return res.status(401).json({ message: 'Kredensial tidak valid.' });
  }

  bcrypt.compare(password, admin.password, (err, result) => {
    if (result) {
      const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Kredensial tidak valid.' });
    }
  });
});

app.get('/api/admin/pengurus', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, name, role, photoUrl FROM pengurus ORDER BY name').all();
  res.json(rows);
});
app.post('/api/admin/pengurus', requireAdmin, upload.single('photo'), (req, res) => {
  const { name, role } = req.body || {};
  if (!name || !role) return res.status(400).json({ message: 'Nama dan jabatan wajib' });
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.photoUrl || '');
  const id = 'pengurus_' + Date.now();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO pengurus (id, name, role, photoUrl, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(id, String(name).trim(), String(role).trim(), photoUrl, createdAt);
  res.status(201).json({ id, name, role, photoUrl });
});
app.delete('/api/admin/pengurus/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM pengurus WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const osis = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='osis'").get()?.value || '{}');
  const mission = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='mission'").get()?.value || '[]');
  res.json({ osis, mission });
});
app.put('/api/admin/settings', requireAdmin, upload.single('logo'), (req, res) => {
  const { osis_name, osis_desc, osis_mission } = req.body || {};

  // Get current OSIS settings to preserve old logo if no new one is uploaded
  const currentOsis = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='osis'").get()?.value || '{}');

  const newOsisData = {
    name: osis_name || currentOsis.name,
    description: osis_desc || currentOsis.description,
    logoUrl: req.file ? `/uploads/${req.file.filename}` : (currentOsis.logoUrl || '')
  };
  const mission = osis_mission.split('\n').map((s) => s.trim()).filter(Boolean);

  const set = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  set.run('osis', JSON.stringify(newOsisData));
  set.run('mission', JSON.stringify(mission));
  res.json({ success: true });
});

// Pembina admin CRUD
app.get('/api/admin/pembina', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, name, role, photoUrl FROM pembina ORDER BY name').all();
  res.json(rows);
});
app.post('/api/admin/pembina', requireAdmin, upload.single('photo'), (req, res) => {
  const { name, role } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Nama wajib' });
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.photoUrl || '');
  const id = 'pembina_' + Date.now();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO pembina (id, name, role, photoUrl, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(id, String(name).trim(), (role || '').toString(), photoUrl, createdAt);
  res.status(201).json({ id, name, role: role || '', photoUrl });
});
app.delete('/api/admin/pembina/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM pembina WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/agendas/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM agendas WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
app.delete('/api/admin/articles/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Gallery public & admin
app.get('/api/gallery', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, url, caption, createdAt FROM gallery ORDER BY datetime(createdAt) DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Gagal membaca galeri' });
  }
});
app.post('/api/admin/gallery', requireAdmin, upload.single('image'), (req, res) => {
  const { caption } = req.body || {};
  if (!req.file) return res.status(400).json({ message: 'File gambar wajib diunggah' });
  const url = `/uploads/${req.file.filename}`;
  const id = 'gallery_' + Date.now();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO gallery (id, url, caption, createdAt) VALUES (?, ?, ?, ?)')
    .run(id, url, (caption || '').toString(), createdAt);
  res.status(201).json({ id, url, caption: caption || '', createdAt });
});
app.delete('/api/admin/gallery/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Web OSIS running at http://localhost:${PORT}`);
});
