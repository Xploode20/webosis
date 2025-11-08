// Konfigurasi untuk elemen yang dibagikan di seluruh situs
const siteConfig = {
  identity: {
    name: "OSIS SMA NEGERI 1 BABAT",
    address: "Jl. Raya Babat - Jombang No.1, Babat, Lamongan, Jawa Timur 62271"
  },
  contact: {
    phone: "(0322) 451314",
    email: "info@sman1babat.sch.id"
  },
  socials: {
    instagram: "https://www.instagram.com/osissmababat/",
    youtube: "https://www.youtube.com/@smabaofficial435",
    tiktok: "https://www.tiktok.com/@osis_smaba"
  },
  copyrightText: "Dibuat oleh TIM DEVELOPER SMABA"
};

// Ikon SVG untuk media sosial
const socialIcons = {
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.585-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.07-1.645-.07-4.85s.012-3.585.07-4.85c.148-3.225 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.281-.059-1.689-.073-4.948-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.441 1.441 1.441 1.441-.645 1.441-1.441-.645-1.44-1.441-1.44z"/></svg>`,
  youtube: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>`,
  tiktok: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.73-.21.52-.35 1.02-.41 1.52-.07.5-.01 1 .04 1.48.14 1.13.57 2.2 1.28 3.08.9.86 2.12 1.47 3.48 1.56.91.07 1.82-.16 2.64-.69.85-.53 1.52-1.27 1.88-2.15.17-.42.31-.85.39-1.28.07-.37.04-.74.04-1.11v-10.1h-4.19v-4.03c.27-.01.54-.01.81-.02z"/></svg>`
};

// Fungsi untuk merender komponen bersama
function renderSharedComponents() {
  const footerContainer = document.querySelector('.site-footer .container');
  if (footerContainer) {
    const footerHtml = `
      <div class="footer-grid">
        <div class="footer-column">
          <h4 class="footer-title">Identitas Lembaga</h4>
          <p><strong>${siteConfig.identity.name}</strong></p>
          <p>${siteConfig.identity.address}</p>
        </div>
        <div class="footer-column">
          <h4 class="footer-title">Kontak</h4>
          <p>Telepon: ${siteConfig.contact.phone}</p>
          <p>Email: ${siteConfig.contact.email}</p>
        </div>
        <div class="footer-column">
          <h4 class="footer-title">Media Sosial</h4>
          <div class="social-links">
            <a href="${siteConfig.socials.instagram}" target="_blank" rel="noopener noreferrer">${socialIcons.instagram} Instagram</a>
            <a href="${siteConfig.socials.youtube}" target="_blank" rel="noopener noreferrer">${socialIcons.youtube} YouTube</a>
            <a href="${siteConfig.socials.tiktok}" target="_blank" rel="noopener noreferrer">${socialIcons.tiktok} TikTok</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${siteConfig.copyrightText}</p>
      </div>
    `;
    footerContainer.innerHTML = footerHtml;
  }
}

// Jalankan fungsi saat DOM siap
document.addEventListener('DOMContentLoaded', renderSharedComponents);