const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); };

const TOKEN_KEY = 'adminToken';
const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function applyAdminStatus() {
  const isLoggedIn = !!getToken();
  $('#admin-status').textContent = isLoggedIn ? 'Mode admin aktif' : 'Silakan login untuk mengelola konten.';
  if (isLoggedIn) {
    document.body.classList.add('admin-logged-in');
  } else {
    document.body.classList.remove('admin-logged-in');
  }
}

async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  // Hapus Content-Type jika body adalah FormData, browser akan menanganinya
  if (opts.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  if (opts.auth !== false) headers['x-admin-token'] = getToken();
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  return res;
}

async function loadArticles() {
  const res = await fetch('/api/articles');
  const items = await res.json();
  const list = $('#articles');
  list.innerHTML = '';
  items.forEach((a) => { // eslint-disable-line no-shadow
    const li = document.createElement('li');
    li.className = 'card post-item';
    const thumbnailHtml = a.thumbnailUrl
      ? `<img src="${a.thumbnailUrl}" alt="Thumbnail" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 12px;">`
      : '';
    li.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
        <div style="display:flex; align-items:center;">
          ${thumbnailHtml}
          <div><strong>${a.title}</strong><div class="post-meta">${a.author} • ${new Date(a.createdAt).toLocaleString('id-ID')}</div></div>
        </div>
        <button data-id="${a.id}" class="btn">Hapus</button>
      </div>`;
    list.appendChild(li);
  });
}

async function loadGallery() {
  const res = await fetch('/api/gallery');
  const items = await res.json();
  const list = $('#gallery');
  if (!list) return; // if section not present
  list.innerHTML = '';
  items.forEach((g) => {
    const li = document.createElement('li');
    li.className = 'card post-item';
    li.innerHTML = `<div style=\"display:flex; justify-content:space-between; align-items:center\"><div><div><strong>${g.caption || 'Gambar'}</strong></div><div class=\"post-meta\">${g.url}</div></div><button data-id=\"${g.id}\" class=\"btn\">Hapus</button></div>`;
    list.appendChild(li);
  });
}

async function loadAgendas() {
  const res = await api('/api/agendas');
  const items = await res.json();
  const list = $('#agendas');
  list.innerHTML = '';
  items.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'card post-item';
    let dateString = new Date(p.startDate + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'long' });
    if (p.endDate) {
      dateString += ` - ${new Date(p.endDate + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'long' })}`;
    }

    li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center"><strong>${p.name}</strong><button data-id="${p.id}" class="btn">Hapus</button></div><div class="post-meta">${dateString}</div>`;
    list.appendChild(li);
  });
}

async function loadPengurus() {
  const res = await api('/api/admin/pengurus');
  if (!res.ok) { $('#pengurus').innerHTML = '<li class="hint">Masuk admin untuk melihat data.</li>'; return; }
  const items = await res.json();
  console.log('Data Pengurus berhasil dimuat:', items); // Log debug
  const list = $('#pengurus'); // eslint-disable-line no-shadow
  if (!list) { console.warn('Elemen #pengurus tidak ditemukan di DOM.'); return; }
  if (list) { // Pastikan elemen list ada
    // Clear the list more robustly
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    items.forEach((m) => {
      const li = document.createElement('li');
      li.className = 'card post-item';

      const containerDiv = document.createElement('div');
      containerDiv.style.display = 'flex';
      containerDiv.style.justifyContent = 'space-between';
      containerDiv.style.alignItems = 'center';
      containerDiv.style.width = '100%';

      const contentDiv = document.createElement('div');
      contentDiv.style.display = 'flex';
      contentDiv.style.alignItems = 'center';

      if (m.photoUrl) {
        const img = document.createElement('img');
        img.src = m.photoUrl;
        img.alt = m.name;
        img.style.width = '40px';
        img.style.height = '40px';
        img.style.borderRadius = '8px';
        img.style.objectFit = 'cover';
        img.style.marginRight = '12px';
        contentDiv.appendChild(img);
      }

      const textDiv = document.createElement('div');
      const nameStrong = document.createElement('strong');
      nameStrong.textContent = m.name;
      const roleDiv = document.createElement('div');
      roleDiv.className = 'post-meta';
      roleDiv.textContent = m.role;
      textDiv.appendChild(nameStrong);
      textDiv.appendChild(roleDiv);
      contentDiv.appendChild(textDiv);

      const deleteButton = document.createElement('button');
      deleteButton.setAttribute('data-id', m.id);
      deleteButton.className = 'btn';
      deleteButton.textContent = 'Hapus';

      containerDiv.appendChild(contentDiv);
      containerDiv.appendChild(deleteButton);
      li.appendChild(containerDiv);
      list.appendChild(li);
      console.log('Appended Pengurus item:', m.name);
    });
  } else {
    console.warn('Elemen #pengurus tidak ditemukan di DOM.');
  }
}

// Helper to clear file input
const clearFileInput = (input) => { input.value = ''; };

async function loadSettings() {
  const res = await api('/api/admin/settings');
  if (!res.ok) return;
  const { osis, mission } = await res.json();
  $('[name="osis_name"]').value = osis?.name || '';
  $('[name="osis_desc"]').value = osis?.description || '';
  $('[name="osis_mission"]').value = (mission || []).join('\n');
}

function initializeQuillEditor() {
  if (!$('#quill-editor')) return;

  const toolbarOptions = [
    [{ 'header': [1, 2, 3, 4, false] }],
    [{ 'font': [] }],
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],

    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
    [{ 'direction': 'rtl' }],                         // text direction

    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'align': [] }],

    ['clean']                                         // remove formatting button
  ];

  const quill = new Quill('#quill-editor', {
    modules: {
      toolbar: toolbarOptions
    },
    theme: 'snow'
  });

  // Sinkronkan konten Quill ke input tersembunyi sebelum submit
  const form = $('#article-form');
  if (form) {
    form.addEventListener('submit', () => {
      const contentInput = $('#hidden-content-input');
      contentInput.value = quill.root.innerHTML;
    });
  }
}

function bindAuthControls() {
  $('#admin-login').addEventListener('click', async () => {
    const email = ($('#admin-email').value || '').trim();
    const password = ($('#admin-password').value || '').trim();
    if (!email || !password) {
      toast('Email dan password harus diisi.');
      return;
    }

    const res = await api('/api/admin/login', {
      method: 'POST',
      auth: false, // Tidak perlu mengirim token untuk login
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      const { token } = await res.json();
      setToken(token);
      applyAdminStatus();
      toast('Login berhasil. Mode admin aktif.');
      // Muat semua data setelah login berhasil
      loadArticles(); loadAgendas(); loadPengurus(); loadSettings(); loadPembina(); loadGallery();
    } else {
      toast('Login gagal. Periksa kembali email dan password.');
    }
  });
  $('#admin-logout').addEventListener('click', () => {
    clearToken();
    applyAdminStatus();
    toast('Mode admin dimatikan');
  });
}

function bindForms() {
  $('#article-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget; // eslint-disable-line no-shadow
    const fd = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]'); // eslint-disable-line no-shadow
    submitBtn.disabled = true;
    const res = await api('/api/articles', { method: 'POST', body: fd });
    submitBtn.disabled = false;
    if (res.ok) { form.reset(); clearFileInput(form.querySelector('input[type="file"][name="thumbnail"]')); toast('Artikel ditambahkan'); loadArticles(); } else toast('Gagal');
  });
  $('#articles').addEventListener('click', async (e) => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;
    if (window.confirm('Apakah Anda yakin ingin menghapus artikel ini?')) {
      const res = await api(`/api/admin/articles/${id}`, { method: 'DELETE' });
      if (res.ok) { toast('Artikel dihapus'); loadArticles(); }
    }
  });
  $('#agenda-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const res = await api('/api/agendas', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd.entries())) });
    submitBtn.disabled = false;
    if (res.ok) { form.reset(); toast('Agenda ditambahkan'); loadAgendas(); } else toast('Gagal');
  });
  $('#agendas').addEventListener('click', async (e) => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;
    if (window.confirm('Apakah Anda yakin ingin menghapus agenda ini?')) {
      const res = await api(`/api/admin/agendas/${id}`, { method: 'DELETE' });
      if (res.ok) { toast('Agenda dihapus'); loadAgendas(); }
    }
  });
  $('#pengurus-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    console.log('Pengurus form submit: Disabling button.');
    submitBtn.disabled = true;
    const res = await api('/api/admin/pengurus', { method: 'POST', body: fd });
    console.log('Pengurus form submit: API response received.', res);
    submitBtn.disabled = false;
    console.log('Pengurus form submit: Re-enabling button.');
    if (res.ok) { form.reset(); clearFileInput(form.querySelector('input[type="file"][name="photo"]')); toast('Pengurus berhasil ditambahkan!'); loadPengurus(); } else toast('Gagal menambahkan pengurus.');
  });
  $('#pengurus').addEventListener('click', async (e) => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;
    if (window.confirm('Apakah Anda yakin ingin menghapus pengurus ini?')) {
      const res = await api(`/api/admin/pengurus/${id}`, { method: 'DELETE' });
      if (res.ok) { toast('Pengurus dihapus'); loadPengurus(); }
    }
  });

  const galleryForm = $('#gallery-form');
  if (galleryForm) {
    galleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const submitBtn = form.querySelector('button[type="submit"]');
    console.log('Gallery form submit: Disabling button.');
      submitBtn.disabled = true;
      const res = await api('/api/admin/gallery', { method: 'POST', body: fd });
    console.log('Gallery form submit: API response received.', res);
      submitBtn.disabled = false;
      if (res.ok) { form.reset(); clearFileInput(form.querySelector('input[type="file"][name="image"]')); toast('Gambar berhasil ditambahkan!'); loadGallery(); } else toast('Gagal menambahkan gambar.');
    });
    $('#gallery').addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (!id) return;
      if (window.confirm('Apakah Anda yakin ingin menghapus gambar ini?')) {
        const res = await api(`/api/admin/gallery/${id}`, { method: 'DELETE' });
        if (res.ok) { toast('Gambar dihapus'); loadGallery(); }
      }
    });
  }
  $('#pembina-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]'); // This was the duplicated line in previous fix, now it's correct
    submitBtn.disabled = true;
    const res = await api('/api/admin/pembina', { method: 'POST', body: fd });
    console.log('Pembina form submit: API response received.', res);
    submitBtn.disabled = false;
    console.log('Pembina form submit: Re-enabling button.');
    if (res.ok) { form.reset(); clearFileInput(form.querySelector('input[type="file"][name="photo"]')); toast('Pembina berhasil ditambahkan!'); loadPembina(); } else toast('Gagal menambahkan pembina.');
  });
  $('#pembina').addEventListener('click', async (e) => {
    const id = e.target.getAttribute('data-id');
    if (!id) return;
    if (window.confirm('Apakah Anda yakin ingin menghapus pembina ini?')) {
      const res2 = await api(`/api/admin/pembina/${id}`, { method: 'DELETE' });
      if (res2.ok) { toast('Pembina dihapus'); loadPembina(); }
    }
  });
  $('#settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    console.log('Settings form submit: Disabling button.');
    submitBtn.disabled = true;
    const res = await api('/api/admin/settings', { method: 'PUT', body: fd });
    console.log('Settings form submit: API response received.', res);
    submitBtn.disabled = false;
    console.log('Settings form submit: Re-enabling button.');
    if (res.ok) { toast('Profil disimpan'); loadSettings(); } else toast('Gagal menyimpan');
  });
}

async function loadPembina() {
  const res = await api('/api/admin/pembina');
  if (!res.ok) { $('#pembina').innerHTML = '<li class="hint">Masuk admin untuk melihat data.</li>'; return; }
  const items = await res.json();
  console.log('Data Pembina berhasil dimuat:', items); // Log debug
  const list = $('#pembina'); // eslint-disable-line no-shadow
  if (!list) { console.warn('Elemen #pembina tidak ditemukan di DOM.'); return; }
  if (list) { // Pastikan elemen list ada
    // Clear the list more robustly
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    items.forEach((m) => {
      const li = document.createElement('li');
      li.className = 'card post-item';

      const containerDiv = document.createElement('div');
      containerDiv.style.display = 'flex';
      containerDiv.style.justifyContent = 'space-between';
      containerDiv.style.alignItems = 'center';
      containerDiv.style.width = '100%';

      const contentDiv = document.createElement('div');
      contentDiv.style.display = 'flex';
      contentDiv.style.alignItems = 'center';

      if (m.photoUrl) {
        const img = document.createElement('img');
        img.src = m.photoUrl;
        img.alt = m.name;
        img.style.width = '40px';
        img.style.height = '40px';
        img.style.borderRadius = '8px';
        img.style.objectFit = 'cover';
        img.style.marginRight = '12px';
        contentDiv.appendChild(img);
      }

      const textDiv = document.createElement('div');
      const nameStrong = document.createElement('strong');
      nameStrong.textContent = m.name;
      const roleDiv = document.createElement('div');
      roleDiv.className = 'post-meta';
      roleDiv.textContent = m.role || '';
      textDiv.appendChild(nameStrong);
      textDiv.appendChild(roleDiv);
      contentDiv.appendChild(textDiv);

      const deleteButton = document.createElement('button');
      deleteButton.setAttribute('data-id', m.id);
      deleteButton.className = 'btn';
      deleteButton.textContent = 'Hapus';

      containerDiv.appendChild(contentDiv);
      containerDiv.appendChild(deleteButton);
      li.appendChild(containerDiv);
      list.appendChild(li);
      console.log('Appended Pembina item:', m.name);
    });
  } else {
    console.warn('Elemen #pembina tidak ditemukan di DOM.');
  }
}

function bindAdminMenu() {
  const menu = $('#admin-header-items');
  if (!menu) return;

  menu.addEventListener('click', (e) => {
    e.preventDefault();
    const targetLink = e.target.closest('a');
    if (!targetLink) return;

    const targetId = targetLink.dataset.target;
    if (!targetId) return;

    // Hapus kelas 'active' dari semua link dan panel
    $$('#admin-header-items a').forEach(link => link.classList.remove('active'));
    $$('.admin-content-panel').forEach(panel => panel.classList.remove('active'));

    // Tambahkan kelas 'active' ke link yang diklik dan panel target
    targetLink.classList.add('active');
    $(`#${targetId}`).classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if ($('#admin-year')) $('#admin-year').textContent = new Date().getFullYear();
  applyAdminStatus();
  bindAuthControls();
  bindForms();
  initializeQuillEditor();
  bindAdminMenu();

  // Jika sudah login saat halaman dimuat, langsung muat semua data
  if (getToken()) {
    toast('Mode admin sudah aktif.');
    loadArticles();
    loadAgendas();
    loadPengurus();
    loadSettings();
    loadPembina();
    loadGallery();
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
