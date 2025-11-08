const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const showToast = (msg) => {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
};

const formatDate = (isoString) => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d);
  } catch {
    return isoString;
  }
};

// Admin token handling (homepage no longer has login; keep helpers for headers)
const ADMIN_TOKEN_KEY = 'adminToken';
const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY) || '';

async function loadProfiles() {
  try {
    const res = await fetch('/api/profiles');
    if (!res.ok) throw new Error('Gagal memuat profil OSIS');
    const data = await res.json();
    const { osis, pengurus, pembina } = data;

    const osisName = $('#osis-name');
    if (osisName) {
      osisName.textContent = osis.name;
      $('#osis-desc').textContent = osis.description;
      const missionList = $('#osis-mission');
      missionList.innerHTML = '';
      (osis.mission || []).forEach((m) => {
        const li = document.createElement('li');
        li.textContent = m;
        missionList.appendChild(li);
      });
    }

    // Pengurus
    const pengurusGrid = $('#pengurus-grid');
    if (pengurusGrid) {
      pengurusGrid.innerHTML = '';
      (pengurus || []).forEach((p) => {
        const card = document.createElement('div');
        card.className = 'card pengurus-card';
        const initials = p.name
          .split(' ')
          .map((s) => s[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        const avatarContent = p.photoUrl
          ? `<img src="${p.photoUrl}" alt="${p.name}" style="width: 64px; height: 64px; border-radius: var(--radius); object-fit: cover;">`
          : `<div class="avatar">${initials}</div>`;
        card.innerHTML = `
          ${avatarContent}
          <div>
            <div style="font-weight:600">${p.name}</div>
            <div style="color:#94a3b8">${p.role}</div>
          </div>
        `;
        pengurusGrid.appendChild(card);
      });
    }

    // Pembina
    const pembinaGrid = $('#pembina-grid');
    if (pembinaGrid) {
      pembinaGrid.innerHTML = '';
      (pembina || []).forEach((b) => {
        const card = document.createElement('div');
        card.className = 'card pengurus-card'; // Menggunakan class yang sama dengan pengurus untuk konsistensi
        const initials = (b.name || '')
          .split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
        const avatarContent = b.photoUrl
          ? `<img src="${b.photoUrl}" alt="${b.name}" style="width: 64px; height: 64px; border-radius: var(--radius); object-fit: cover;">`
          : `<div class="avatar">${initials}</div>`;
        card.innerHTML = `
          ${avatarContent}
          <div>
            <div style="font-weight:600">${b.name}</div>
            <div style="color:#94a3b8">${b.role || ''}</div>
          </div>
        `;
        pembinaGrid.appendChild(card);
      });
    }
  } catch (error) {
    console.error('Error di loadProfiles:', error);
  }
}

async function loadAgendaAndRenderCalendar() {
  console.log('Mencoba merender kalender...');

  try {
    if (!window.VanillaJsCalendar) {
      console.error('Library VanillaJsCalendar tidak ditemukan. Pastikan skripnya dimuat dengan benar.');
      return;
    }

    const res = await fetch('/api/agendas');
    const agendas = await res.json();
    const agendaDetailsEl = $('#agenda-details');
    const agendaWrapperEl = $('#agenda-details-wrapper');
    
    // Fungsi untuk menghasilkan semua tanggal dalam rentang
    const getDatesInRange = (startDate, endDate) => {
      const dates = [];
      // Buat tanggal dalam UTC untuk menghindari masalah timezone
      let currentDate = new Date(startDate);
      const lastDate = new Date(endDate);
      while (currentDate <= lastDate) {
        // Format tanggal kembali ke YYYY-MM-DD tanpa konversi timezone
        dates.push(new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 10));
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
      return dates;
    };

    // Buat array dari semua tanggal yang harus ditandai
    const markedDates = agendas.flatMap(a => a.endDate ? getDatesInRange(a.startDate, a.endDate) : [a.startDate]);

    // Definisikan nama bulan di luar 'options' agar bisa diakses oleh onMonthChange
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const options = {
      // Secara eksplisit menyediakan nama hari untuk menghindari bug di library
      weekdays: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
      // Secara eksplisit menyediakan nama bulan untuk menghindari bug di library
      months: monthNames,
      // Secara eksplisit menyediakan jumlah hari per bulan untuk menghindari bug di library
      days: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
      // Fungsi callback untuk menangani klik pada tanggal
      markedDates: markedDates,
      onSelect: () => {
        // Nonaktifkan aksi saat tanggal diklik
      },
      // Fungsi yang dijalankan saat bulan di kalender berubah
      onMonthChange: (data) => {
        // Perbaiki bug perpindahan tahun di library kalender
        const correctedDate = new Date(data.year, data.month);
        const currentMonth = correctedDate.getMonth(); // 0-11
        const currentYear = correctedDate.getFullYear();

        // Filter agenda untuk bulan dan tahun yang sedang ditampilkan
        const eventsInThisMonth = agendas.filter(a => {
          const eventStart = new Date(a.startDate + 'T00:00:00');
          const eventEnd = a.endDate ? new Date(a.endDate + 'T00:00:00') : eventStart;
          return (eventStart.getMonth() === currentMonth && eventStart.getFullYear() === currentYear) ||
                 (eventEnd.getMonth() === currentMonth && eventEnd.getFullYear() === currentYear) ||
                 (eventStart < correctedDate && eventEnd > correctedDate);
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate)); // Urutkan berdasarkan tanggal

        // Tampilkan atau sembunyikan wrapper section
        agendaWrapperEl.style.display = 'block';

        if (eventsInThisMonth.length > 0) {
          agendaDetailsEl.innerHTML = `<h4>Agenda untuk ${monthNames[currentMonth]} ${currentYear}</h4><ul>${eventsInThisMonth.map(e => {
            const day = new Date(e.startDate + 'T00:00:00').getDate();
            const dateString = e.endDate ? `${day} - ${new Date(e.endDate + 'T00:00:00').getDate()} ${monthNames[currentMonth]}` : `${day} ${monthNames[currentMonth]}`;
            return `<li><strong>${dateString}</strong>: ${e.name}</li>`;
          }).join('')}</ul>`;
        } else {
          agendaDetailsEl.innerHTML = `<p class="hint" style="text-align: center;">Tidak ada agenda kegiatan pada bulan ini.</p>`;
        }

        // Beri jeda singkat agar browser sempat merender elemen sebelum AOS di-refresh
        AOS.refresh();
      }
    };

    const calendar = new window.VanillaJsCalendar('#calendar-container', options);
    calendar.init();
    console.log('Inisialisasi kalender berhasil.');
  } catch (error) {
    console.error('Error saat memuat agenda atau menginisialisasi kalender:', error);
  }
}

function handleReportForm() {
  const form = $('#report-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      showToast('Gagal mengirim saran/laporan');
      return;
    }
    
    form.reset();
    showToast('Terima kasih, masukan Anda sudah terkirim secara anonim.');
  });
}

// Articles
async function loadArticles() {
  const res = await fetch('/api/articles');
  const items = await res.json();
  const list = $('#articles');
  if (!list) return; // Pastikan elemen ada
  list.innerHTML = '';
  // Ambil hanya 3 artikel terbaru
  items.slice(0, 3).forEach((a) => {
    const li = document.createElement('li');
    li.className = 'card post-item';
    li.setAttribute('data-aos', 'fade-up');

    // Buat potongan tulisan (snippet), sekitar 100 karakter
    const snippet = a.content.length > 100 ? a.content.substring(0, 100) + '...' : a.content;

    const thumbnailHtml = a.thumbnailUrl
      ? `<img src="${a.thumbnailUrl}" alt="Thumbnail ${a.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;">`
      : '';

    li.innerHTML = `
      <a href="/artikel.html?id=${a.id}" style="text-decoration: none; color: inherit; display: block;">
        ${thumbnailHtml}
        <h4 class="post-title">${a.title}</h4>
        <div class="post-meta">${a.author} • ${formatDate(a.createdAt)}</div>
        <div style="opacity: 0.8;">${snippet}</div>
      </a>
    `;
    list.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  AOS.init({
    duration: 800, // Durasi animasi dalam milidetik
    once: true,    // Apakah animasi hanya terjadi sekali
  });
  // Fungsi renderSharedComponents dari shared.js akan menangani footer
  loadProfiles(); // Memuat profil OSIS, pengurus, dan pembina
  if ($('#report-form')) {
    handleReportForm();
  }

  // Logika untuk tombol "Kembali ke Atas"
  const toTopBtn = $('#to-top-btn');
  if (toTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        toTopBtn.classList.add('show');
      } else {
        toTopBtn.classList.remove('show');
      }
    });

    toTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});

// Panggil fungsi yang bergantung pada resource eksternal setelah window.onload
window.addEventListener('load', () => {
  if ($('#calendar-container')) loadAgendaAndRenderCalendar();
  if ($('#articles')) loadArticles();

  // Refresh AOS sekali lagi setelah semua konten dinamis awal dimuat
  setTimeout(() => AOS.refresh(), 100);
});
