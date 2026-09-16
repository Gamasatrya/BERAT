/**
 * Firebase Articles — Public Frontend
 * 
 * Mengambil artikel published dari Firestore (via REST API /api/articles)
 * dan menampilkannya di halaman publik (index.html).
 * 
 * Script ini:
 *  - NON-BLOCKING: jika Firebase belum dikonfigurasi, halaman tetap berjalan normal
 *  - Hanya merender artikel jika elemen #articles-section ada di halaman
 *  - Tidak mengubah atau mengganggu konten/fitur halaman existing
 */

(function() {
  'use strict';

  /**
   * Render daftar artikel ke dalam container yang diberikan.
   * @param {Array}       articles   — array of article objects
   * @param {HTMLElement} container  — elemen container target
   */
  function renderPublicArticles(articles, container) {
    if (!articles || articles.length === 0) {
      container.innerHTML =
        '<div class="articles-empty" style="text-align:center;padding:3rem;color:#9ca3af;">' +
          '<p>Belum ada artikel yang dipublikasikan.</p>' +
        '</div>';
      return;
    }

    container.innerHTML = articles.map(function(article) {
      const dateStr = article.createdAt
        ? new Date(article.createdAt).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
          })
        : '';

      const imgHtml = article.imageUrl
        ? '<div class="article-card-img"><img src="' + article.imageUrl + '" alt="' + escapeHtml(article.title) + '" loading="lazy"></div>'
        : '<div class="article-card-img article-card-img--placeholder"><i data-lucide="image" style="width:48px;height:48px;opacity:0.2;"></i></div>';

      const excerpt = article.excerpt
        || (article.content ? article.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '');

      return (
        '<article class="article-card reveal-up" data-article-id="' + article.id + '">' +
          imgHtml +
          '<div class="article-card-body">' +
            (dateStr ? '<time class="article-card-date">' + dateStr + '</time>' : '') +
            '<h3 class="article-card-title">' + escapeHtml(article.title) + '</h3>' +
            '<p class="article-card-excerpt">' + escapeHtml(excerpt) + '</p>' +
            '<button class="article-card-readmore btn btn-outline btn-sm" data-article-id="' + article.id + '">' +
              'Baca Selengkapnya' +
            '</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    // Re-init icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Bind "Baca Selengkapnya" buttons → buka modal detail
    container.querySelectorAll('.article-card-readmore').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = btn.getAttribute('data-article-id');
        openArticleModal(id, articles);
      });
    });
  }

  /**
   * Buka modal artikel untuk menampilkan konten lengkap
   */
  function openArticleModal(articleId, articles) {
    const article = articles.find(function(a) { return a.id === articleId; });
    if (!article) return;

    // Buat modal jika belum ada
    let modal = document.getElementById('article-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id        = 'article-detail-modal';
      modal.className = 'lightbox'; // Gunakan class lightbox existing untuk styling konsisten
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.style.cssText = 'display:none;z-index:9999;';
      modal.innerHTML =
        '<div class="lightbox-content" style="max-width:800px;width:95%;background:var(--bg-secondary,#1a1a2e);border-radius:16px;padding:2rem;max-height:90vh;overflow-y:auto;position:relative;">' +
          '<button id="article-modal-close" class="lightbox-close" aria-label="Tutup" style="position:sticky;top:0;float:right;z-index:1;">' +
            '<i data-lucide="x" style="width:24px;height:24px;"></i>' +
          '</button>' +
          '<div id="article-modal-body"></div>' +
        '</div>';
      document.body.appendChild(modal);

      // Close on backdrop click
      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
      });

      // Close button
      modal.querySelector('#article-modal-close').addEventListener('click', function() {
        modal.style.display = 'none';
      });
    }

    // Isi konten modal
    const body    = modal.querySelector('#article-modal-body');
    const dateStr = article.createdAt
      ? new Date(article.createdAt).toLocaleDateString('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric'
        })
      : '';

    const isHtml = /<[a-z][\s\S]*>/i.test(article.content || '');
    const contentHtml = isHtml
      ? article.content
      : (article.content || '')
          .split('\n\n')
          .filter(function(p) { return p.trim(); })
          .map(function(p) { return '<p>' + escapeHtml(p.trim()).replace(/\n/g, '<br>') + '</p>'; })
          .join('');

    body.innerHTML =
      (article.imageUrl
        ? '<img src="' + article.imageUrl + '" alt="' + escapeHtml(article.title) + '" style="width:100%;max-height:350px;object-fit:cover;border-radius:10px;margin-bottom:1.5rem;">'
        : '') +
      (dateStr ? '<p style="color:#9ca3af;font-size:0.85rem;margin-bottom:0.5rem;">' + dateStr + '</p>' : '') +
      '<h2 style="margin-bottom:1rem;font-size:1.6rem;">' + escapeHtml(article.title) + '</h2>' +
      '<div class="article-content" style="line-height:1.8;color:#d1d5db;">' +
        contentHtml +
      '</div>';

    if (typeof lucide !== 'undefined') lucide.createIcons();

    modal.style.display = 'flex';
  }

  /**
   * Muat dan tampilkan artikel dari API
   */
  async function loadPublicArticles() {
    const section = document.getElementById('articles-section');
    if (!section) return; // Tidak ada section artikel di halaman ini

    const grid = document.getElementById('articles-grid');
    if (!grid) return;

    // Tampilkan loading state
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#9ca3af;">' +
        '<div style="width:32px;height:32px;border:3px solid #374151;border-top-color:#4f46e5;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;"></div>' +
        '<p>Memuat artikel...</p>' +
      '</div>';

    try {
      const res = await fetch('/api/articles');

      if (!res.ok) {
        // Jika Firebase belum dikonfigurasi (503), sembunyikan section
        if (res.status === 503 || res.status === 500) {
          section.style.display = 'none';
          return;
        }
        throw new Error('HTTP ' + res.status);
      }

      const articles = await res.json();

      if (articles.length === 0) {
        // Jika tidak ada artikel, sembunyikan section agar halaman tetap bersih
        section.style.display = 'none';
        return;
      }

      renderPublicArticles(articles, grid);

    } catch (err) {
      // Jika gagal (server offline, dll), sembunyikan section dengan graceful
      console.log('[Firebase Articles] Tidak dapat memuat artikel:', err.message);
      section.style.display = 'none';
    }
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPublicArticles);
  } else {
    loadPublicArticles();
  }

})();
