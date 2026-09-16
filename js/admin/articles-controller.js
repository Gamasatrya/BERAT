/**
 * Articles Controller — Firebase Integration untuk Admin Panel
 * 
 * Controller ini TERPISAH dari admin-app.js agar tidak mengubah kode existing.
 * Dijalankan setelah admin-app.js dimuat.
 * 
 * Mengelola:
 *  - Tab navigasi Artikel (terintegrasi dengan sistem tab existing)
 *  - CRUD artikel via Firebase Firestore (melalui REST API /api/articles)
 *  - Upload gambar ke Firebase Storage
 *  - Update stat card artikel di Dashboard
 */

(function() {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────────────────
  let articlesList      = [];
  let currentEditId     = null;
  let currentImageUrl   = '';
  let isFormVisible     = false;

  // ─── Inisialisasi setelah DOM siap ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    // Inject panel Artikel dari <template> ke dalam #admin-layout > .main-content
    injectArticlesPanel();

    // Inisialisasi Firebase (non-blocking)
    initFirebaseForArticles();

    // Bind tab navigation untuk tab "articles" (integrasi dengan sistem tab existing)
    bindArticlesTabNavigation();
  });

  // ─── Inject Panel dari Template ─────────────────────────────────────────────
  function injectArticlesPanel() {
    const template = document.getElementById('tab-articles-template');
    if (!template) return;

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Clone template content dan append ke .main-content
    const clone = template.content.cloneNode(true);
    mainContent.appendChild(clone);

    // Bind semua event listeners setelah panel di-inject
    bindArticlesPanelEvents();
  }

  // ─── Firebase Init ───────────────────────────────────────────────────────────
  async function initFirebaseForArticles() {
    const statusEl = document.getElementById('articles-firebase-status');
    if (statusEl) statusEl.textContent = 'Menghubungkan ke Firebase...';

    try {
      const ok = await window.fbInit();
      if (statusEl) {
        if (ok) {
          statusEl.textContent = '🟢 Firebase terhubung';
          statusEl.style.color = '#10b981';
        } else {
          statusEl.textContent = '🟡 Firebase belum dikonfigurasi — upload gambar tidak tersedia';
          statusEl.style.color = '#f59e0b';
        }
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = '🔴 Firebase error: ' + e.message;
        statusEl.style.color = '#ef4444';
      }
    }
  }

  // ─── Tab Navigation Integration ──────────────────────────────────────────────
  function bindArticlesTabNavigation() {
    // Hook ke click menu item "articles"
    // Kode ini mendeteksi saat tab "articles" diklik dan load data
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(function(item) {
      if (item.getAttribute('data-tab') === 'articles') {
        item.addEventListener('click', function() {
          // Delay sedikit agar switchTab() dari admin-app.js selesai dulu
          setTimeout(function() {
            loadArticles();
          }, 50);
        });
      }
    });

    // Override switchTab di window agar tab articles bisa muncul
    // Strategi: Wrap switchTab existing dengan versi kita yang tahu tentang tab articles
    const _originalSwitchTab = window.switchTab;
    window.switchTab = function(tabId) {
      if (tabId === 'articles') {
        // Handle tab articles secara manual
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(function(item) {
          item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
        });

        const tabPanels = document.querySelectorAll('.tab-panel');
        tabPanels.forEach(function(panel) {
          panel.style.display = panel.id === 'tab-articles' ? 'block' : 'none';
        });

        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = 'Manajemen Artikel';

        loadArticles();
        return;
      }
      // Untuk tab lain, panggil fungsi asli
      if (_originalSwitchTab) _originalSwitchTab(tabId);
    };
  }

  // ─── Bind Events setelah Panel Di-inject ─────────────────────────────────────
  function bindArticlesPanelEvents() {
    // Tombol "Artikel Baru"
    const addBtn = document.getElementById('add-article-btn');
    if (addBtn) addBtn.addEventListener('click', showAddForm);

    // Tombol "Refresh"
    const refreshBtn = document.getElementById('refresh-articles-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadArticles);

    // Tombol "Batal" di form
    const cancelBtn = document.getElementById('article-form-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', hideForm);

    // Form submit
    const form = document.getElementById('form-article');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Upload dropzone
    bindUploadDropzone();

    // Hapus gambar
    const removeImgBtn = document.getElementById('article-img-remove');
    if (removeImgBtn) removeImgBtn.addEventListener('click', removeArticleImage);

    // Sync URL manual ke preview
    const manualUrlInput = document.getElementById('article-imageUrl-manual');
    if (manualUrlInput) {
      manualUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        if (url) {
          setArticleImagePreview(url);
        }
      });
    }

    // Toolbar formatting & Pratinjau
    const contentTextarea = document.getElementById('article-content');
    const previewContainer = document.getElementById('article-content-preview');
    const togglePreviewBtn = document.getElementById('article-toggle-preview-btn');
    const insertMediaBtn = document.getElementById('article-insert-media-btn');

    document.querySelectorAll('.article-fmt-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const fmt = btn.getAttribute('data-fmt');
        applyContentFormat(contentTextarea, fmt);
      });
    });

    if (insertMediaBtn) {
      insertMediaBtn.addEventListener('click', function() {
        if (typeof window.openMediaSelector === 'function') {
          window.openMediaSelector(function(url) {
            insertTextAtCursor(contentTextarea, '<img src="' + url + '" alt="Gambar Artikel" style="max-width:100%; border-radius:8px; margin:1rem 0;">');
          });
        }
      });
    }

    if (togglePreviewBtn && previewContainer && contentTextarea) {
      togglePreviewBtn.addEventListener('click', function() {
        if (previewContainer.style.display === 'none') {
          previewContainer.innerHTML = contentTextarea.value || '<em>Konten masih kosong...</em>';
          previewContainer.style.display = 'block';
          togglePreviewBtn.innerHTML = '<i data-lucide="eye-off" style="width:14px;height:14px;"></i> Tutup Pratinjau';
        } else {
          previewContainer.style.display = 'none';
          togglePreviewBtn.innerHTML = '<i data-lucide="eye" style="width:14px;height:14px;"></i> Pratinjau Tampilan';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
      });

      contentTextarea.addEventListener('input', function() {
        if (previewContainer.style.display === 'block') {
          previewContainer.innerHTML = contentTextarea.value || '<em>Konten masih kosong...</em>';
        }
      });
    }
  }

  function applyContentFormat(textarea, fmt) {
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    if (fmt === 'bold') replacement = '<b>' + (selected || 'teks tebal') + '</b>';
    else if (fmt === 'italic') replacement = '<i>' + (selected || 'teks miring') + '</i>';
    else if (fmt === 'h2') replacement = '<h2>' + (selected || 'Judul Bagian H2') + '</h2>';
    else if (fmt === 'h3') replacement = '<h3>' + (selected || 'Subjudul H3') + '</h3>';
    else if (fmt === 'ul') replacement = '<ul>\n  <li>Poin pertama</li>\n  <li>Poin kedua</li>\n</ul>';
    else if (fmt === 'quote') replacement = '<blockquote>' + (selected || 'Kutipan penting...') + '</blockquote>';

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
    textarea.selectionStart = start + replacement.length;
    textarea.selectionEnd = start + replacement.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function insertTextAtCursor(textarea, textToInsert) {
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const val = textarea.value;

    textarea.value = val.substring(0, start) + textToInsert + val.substring(end);
    textarea.focus();
    textarea.selectionStart = start + textToInsert.length;
    textarea.selectionEnd = start + textToInsert.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ─── Upload Dropzone ─────────────────────────────────────────────────────────
  function bindUploadDropzone() {
    const dropzone  = document.getElementById('article-img-dropzone');
    const fileInput = document.getElementById('article-img-input');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', function() { fileInput.click(); });

    ['dragenter', 'dragover'].forEach(function(ev) {
      dropzone.addEventListener(ev, function(e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(function(ev) {
      dropzone.addEventListener(ev, function(e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', function(e) {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) handleImageFile(files[0]);
    });

    fileInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) handleImageFile(this.files[0]);
    });
  }

  async function handleImageFile(file) {
    // Validasi format
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showArticleFormError('Format file tidak diizinkan. Gunakan JPG, JPEG, PNG, atau WEBP.');
      return;
    }

    // Tampilkan progress
    const progressWrap  = document.getElementById('article-upload-progress');
    const progressBar   = document.getElementById('article-upload-bar');
    const progressText  = document.getElementById('article-upload-status');
    const urlField      = document.getElementById('article-img-url-field');

    if (progressWrap) progressWrap.style.display = 'block';
    if (urlField)     urlField.style.display = 'none';
    clearArticleFormError();

    try {
      // Gunakan articleId jika sedang edit, atau 'temp' untuk artikel baru
      const articleId = currentEditId || 'temp-' + Date.now();
      let downloadUrl = '';

      try {
        downloadUrl = await window.fbUploadArticleImage(
          file,
          articleId,
          function(percent) {
            if (progressBar) progressBar.style.width = percent + '%';
            if (progressText) progressText.textContent = 'Mengupload... ' + percent + '%';
          }
        );
      } catch (fbErr) {
        console.warn('[Articles Controller] Firebase Storage failed, falling back to local server upload:', fbErr.message);
        if (progressText) progressText.textContent = 'Mengupload ke server...';

        const token = localStorage.getItem('heti_admin_token');
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload server gagal');
        downloadUrl = data.file.url;
      }

      // Upload berhasil
      if (progressWrap) progressWrap.style.display = 'none';
      setArticleImagePreview(downloadUrl);
      showAdminToast('Gambar artikel berhasil diupload!');

    } catch (err) {
      if (progressWrap) progressWrap.style.display = 'none';
      if (urlField) urlField.style.display = 'block';
      showArticleFormError('Upload gambar gagal: ' + err.message);
    }
  }

  function setArticleImagePreview(url) {
    currentImageUrl = url;

    const previewWrap = document.getElementById('article-img-preview-wrap');
    const previewImg  = document.getElementById('article-img-preview');
    const urlInput    = document.getElementById('article-imageUrl');
    const urlField    = document.getElementById('article-img-url-field');

    if (previewWrap) previewWrap.style.display = 'block';
    if (urlField)    urlField.style.display = 'none';
    if (previewImg)  previewImg.src = url;
    if (urlInput)    urlInput.value = url;
  }

  function removeArticleImage() {
    currentImageUrl = '';

    const previewWrap    = document.getElementById('article-img-preview-wrap');
    const previewImg     = document.getElementById('article-img-preview');
    const urlInput       = document.getElementById('article-imageUrl');
    const urlField       = document.getElementById('article-img-url-field');
    const manualUrl      = document.getElementById('article-imageUrl-manual');

    if (previewWrap) previewWrap.style.display = 'none';
    if (previewImg)  previewImg.src = '';
    if (urlInput)    urlInput.value = '';
    if (urlField)    urlField.style.display = 'block';
    if (manualUrl)   manualUrl.value = '';
  }

  // ─── Load Articles ────────────────────────────────────────────────────────────
  async function loadArticles() {
    const loadingEl   = document.getElementById('articles-loading');
    const errorEl     = document.getElementById('articles-error');
    const tableWrapEl = document.getElementById('articles-table-wrap');

    if (loadingEl)   loadingEl.style.display = 'block';
    if (errorEl)     errorEl.style.display   = 'none';
    if (tableWrapEl) tableWrapEl.style.display = 'none';

    // Ambil JWT token dari admin-app.js (disimpan di localStorage)
    const token = localStorage.getItem('heti_admin_token');
    if (!token) {
      showArticlesError('Anda belum login. Silakan login terlebih dahulu.');
      return;
    }

    try {
      articlesList = await window.fbGetAllArticles(token);
      renderArticlesTable();

      // Update stat counter
      updateArticlesStat(articlesList.length);

      if (loadingEl)   loadingEl.style.display   = 'none';
      if (tableWrapEl) tableWrapEl.style.display = 'block';

    } catch (err) {
      console.error('[Articles Controller] Load error:', err);
      if (loadingEl) loadingEl.style.display = 'none';
      showArticlesError(
        'Gagal memuat artikel: ' + err.message +
        (err.message.includes('belum dikonfigurasi')
          ? '<br><small>Pastikan FIREBASE_PROJECT_ID dan FIREBASE_SERVICE_ACCOUNT sudah diisi di .env</small>'
          : '')
      );
    }
  }

  function renderArticlesTable() {
    const tbody = document.getElementById('articles-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (articlesList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:2rem;color:var(--text-light);">Belum ada artikel. Klik "Artikel Baru" untuk membuat artikel pertama.</td></tr>';
      return;
    }

    articlesList.forEach(function(article) {
      const row = document.createElement('tr');

      const badgeColor  = article.status === 'published' ? 'badge-status-read' : 'badge-status-unread';
      const badgeText   = article.status === 'published' ? 'Published' : 'Draft';
      const createdDate = formatDate(article.createdAt);
      const updatedDate = formatDate(article.updatedAt);

      const titleDisplay = article.title.length > 60
        ? article.title.substring(0, 60) + '...'
        : article.title;

      row.innerHTML =
        '<td><strong>' + escapeHtml(titleDisplay) + '</strong>' +
        (article.imageUrl ? ' <i data-lucide="image" style="width:12px;height:12px;color:var(--primary);vertical-align:middle;" title="Memiliki gambar"></i>' : '') +
        '</td>' +
        '<td><span class="badge ' + badgeColor + '">' + badgeText + '</span></td>' +
        '<td>' + createdDate + '</td>' +
        '<td>' + updatedDate + '</td>' +
        '<td>' +
          '<button class="btn btn-outline btn-sm edit-article-btn" data-id="' + article.id + '" style="margin-right:0.25rem;">Edit</button>' +
          '<button class="btn btn-outline-danger btn-sm delete-article-btn" data-id="' + article.id + '">Hapus</button>' +
        '</td>';

      tbody.appendChild(row);
    });

    // Re-init icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Bind edit & delete buttons
    tbody.querySelectorAll('.edit-article-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openEditForm(btn.getAttribute('data-id'));
      });
    });

    tbody.querySelectorAll('.delete-article-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        confirmDeleteArticle(btn.getAttribute('data-id'));
      });
    });
  }

  // ─── Form Show/Hide ───────────────────────────────────────────────────────────
  function showAddForm() {
    currentEditId   = null;
    currentImageUrl = '';
    isFormVisible   = true;

    const formPanel   = document.getElementById('article-form-panel');
    const formTitle   = document.getElementById('article-form-title');
    const form        = document.getElementById('form-article');

    if (formPanel) formPanel.style.display = 'block';
    if (formTitle) formTitle.textContent   = 'Tambah Artikel Baru';
    if (form)      form.reset();

    // Reset image state
    removeArticleImage();
    clearArticleFormError();

    // Scroll ke form
    if (formPanel) formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function openEditForm(articleId) {
    const article = articlesList.find(function(a) { return a.id === articleId; });
    if (!article) return;

    currentEditId   = articleId;
    currentImageUrl = article.imageUrl || '';
    isFormVisible   = true;

    const formPanel   = document.getElementById('article-form-panel');
    const formTitle   = document.getElementById('article-form-title');
    const editIdInput = document.getElementById('article-edit-id');

    if (formPanel) formPanel.style.display = 'block';
    if (formTitle) formTitle.textContent   = 'Edit Artikel';
    if (editIdInput) editIdInput.value     = articleId;

    // Isi form dengan data artikel
    setFormField('article-title',   article.title);
    setFormField('article-excerpt',  article.excerpt);
    setFormField('article-content',  article.content);
    setSelectField('article-status', article.status);

    // Set image preview jika ada
    if (article.imageUrl) {
      setArticleImagePreview(article.imageUrl);
    } else {
      removeArticleImage();
    }

    clearArticleFormError();

    // Scroll ke form
    if (formPanel) formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function hideForm() {
    const formPanel = document.getElementById('article-form-panel');
    if (formPanel) formPanel.style.display = 'none';

    const form = document.getElementById('form-article');
    if (form) form.reset();

    currentEditId   = null;
    currentImageUrl = '';
    isFormVisible   = false;

    removeArticleImage();
    clearArticleFormError();
  }

  // ─── Form Submit ──────────────────────────────────────────────────────────────
  async function handleFormSubmit(e) {
    e.preventDefault();
    clearArticleFormError();

    const token = localStorage.getItem('heti_admin_token');
    if (!token) {
      showArticleFormError('Sesi login habis. Silakan login kembali.');
      return;
    }

    const title   = getFormField('article-title').trim();
    const excerpt = getFormField('article-excerpt').trim();
    const content = getFormField('article-content').trim();
    const status  = getSelectField('article-status');

    // Ambil imageUrl: prioritas dari preview (hasil upload), lalu URL manual
    const imageUrlFromPreview = document.getElementById('article-imageUrl');
    const imageUrlManual      = document.getElementById('article-imageUrl-manual');
    let imageUrl = currentImageUrl;
    if (!imageUrl && imageUrlFromPreview) imageUrl = imageUrlFromPreview.value.trim();
    if (!imageUrl && imageUrlManual)      imageUrl = imageUrlManual.value.trim();

    if (!title) {
      showArticleFormError('Judul artikel wajib diisi.');
      return;
    }
    if (!content) {
      showArticleFormError('Konten artikel wajib diisi.');
      return;
    }

    const submitBtn = document.getElementById('article-submit-btn');
    if (submitBtn) {
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Menyimpan...';
    }

    const articleData = { title, content, excerpt, imageUrl, status };

    try {
      if (currentEditId) {
        await window.fbUpdateArticle(token, currentEditId, articleData);
        showAdminToast('Artikel berhasil diperbarui!');
      } else {
        await window.fbCreateArticle(token, articleData);
        showAdminToast('Artikel berhasil ditambahkan!');
      }

      hideForm();
      await loadArticles();

    } catch (err) {
      console.error('[Articles Controller] Save error:', err);
      showArticleFormError('Gagal menyimpan artikel: ' + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled    = false;
        submitBtn.innerHTML   = '<i data-lucide="save"></i> Simpan Artikel';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────
  async function confirmDeleteArticle(articleId) {
    const article = articlesList.find(function(a) { return a.id === articleId; });
    const title   = article ? article.title : 'artikel ini';

    if (!confirm('Apakah Anda yakin ingin menghapus artikel "' + title + '" secara permanen?')) return;

    const token = localStorage.getItem('heti_admin_token');
    if (!token) return;

    try {
      await window.fbDeleteArticle(token, articleId);
      showAdminToast('Artikel berhasil dihapus.');
      await loadArticles();

      // Jika form sedang mengedit artikel yang dihapus, tutup form
      if (currentEditId === articleId) hideForm();

    } catch (err) {
      console.error('[Articles Controller] Delete error:', err);
      showAdminToast('Gagal menghapus artikel: ' + err.message, 'danger');
    }
  }

  // ─── Stat Update ──────────────────────────────────────────────────────────────
  function updateArticlesStat(count) {
    const statEl = document.getElementById('stat-articles');
    if (statEl) statEl.textContent = count;

    const badgeEl = document.getElementById('articles-count');
    if (badgeEl) {
      if (count > 0) {
        badgeEl.textContent     = count;
        badgeEl.style.display   = 'inline-block';
      } else {
        badgeEl.style.display   = 'none';
      }
    }
  }

  // ─── UI Helpers ───────────────────────────────────────────────────────────────
  function showArticlesError(html) {
    const errorEl    = document.getElementById('articles-error');
    const errorMsgEl = document.getElementById('articles-error-msg');
    const loadingEl  = document.getElementById('articles-loading');

    if (loadingEl)  loadingEl.style.display   = 'none';
    if (errorEl)    errorEl.style.display      = 'block';
    if (errorMsgEl) errorMsgEl.innerHTML       = html;
  }

  function showArticleFormError(msg) {
    const el = document.getElementById('article-form-error');
    if (el) {
      el.innerHTML      = msg;
      el.style.display  = 'block';
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function clearArticleFormError() {
    const el = document.getElementById('article-form-error');
    if (el) {
      el.textContent    = '';
      el.style.display  = 'none';
    }
  }

  /**
   * Panggil showToast dari admin-app.js (sudah ada di window scope)
   */
  function showAdminToast(message, type) {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent    = message;
    toastEl.className      = 'toast ' + (type || 'success');
    toastEl.style.display  = 'flex';
    setTimeout(function() { toastEl.style.display = 'none'; }, 3500);
  }

  // ─── DOM Helpers ──────────────────────────────────────────────────────────────
  function getFormField(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setFormField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  function getSelectField(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setSelectField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || 'draft';
  }

  function formatDate(isoString) {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleDateString('id-ID', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric'
      });
    } catch (e) {
      return isoString;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

})();
