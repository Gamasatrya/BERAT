/**
 * BIN — Admin Panel JavaScript Application (SPA Router & Controllers)
 * Manages Auth, SPA views, Content Editors, Media, Submissions, and Settings
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let token = localStorage.getItem('heti_admin_token') || null;
  let currentTab = 'dashboard';
  let contentData = null; // Sections content
  let mediaList = [];
  let submissionsList = [];
  let testimonialsList = [];
  let faqList = [];

  // DOM Elements
  const loginContainer = document.getElementById('login-container');
  const adminLayout = document.getElementById('admin-layout');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const pageTitle = document.getElementById('page-title');
  const menuItems = document.querySelectorAll('.menu-item');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const toastEl = document.getElementById('toast');
  const logoutBtn = document.getElementById('logout-btn');
  const userDisplay = document.getElementById('user-display');
  const unreadBadge = document.getElementById('unread-count');

  // Modal elements
  const submissionModal = document.getElementById('submission-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  // Initialize Lucide icons
  const initIcons = () => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  };
  initIcons();

  // ============================================
  // Toast Alert Helper
  // ============================================
  function showToast(message, type = 'success') {
    toastEl.textContent = message;
    toastEl.className = `toast ${type}`;
    toastEl.style.display = 'flex';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      toastEl.style.display = 'none';
    }, 3000);
  }

  // ============================================
  // Authentication & Session (Firebase Auth)
  // ============================================
  let authInitialized = false;

  async function checkSession() {
    // Wait for Firebase to initialize if it hasn't
    if (!window._firebaseAuth) {
      if (!window.initFirebase) {
        showToast('Firebase configuration missing.', 'danger');
        return;
      }
      try {
        await window.initFirebase();
      } catch (err) {
        showToast('Gagal memuat Firebase.', 'danger');
        return;
      }
    }

    if (authInitialized) return;

    window._firebaseAuth.onAuthStateChanged(user => {
      authInitialized = true;
      if (user) {
        // Logged in
        token = "firebase-session-active";
        userDisplay.textContent = user.email.split('@')[0];
        showAdminLayout();
        loadAllData();
      } else {
        // Not logged in
        token = null;
        showLoginView();
      }
    });
  }

  function showLoginView() {
    loginContainer.style.display = 'flex';
    adminLayout.style.display = 'none';
  }

  function showAdminLayout() {
    loginContainer.style.display = 'none';
    adminLayout.style.display = 'flex';
    switchTab(currentTab);
  }

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';

      const emailInput = document.getElementById('login-username').value;
      const passwordInput = document.getElementById('login-password').value;

      try {
        await window._firebaseAuth.signInWithEmailAndPassword(emailInput, passwordInput);
        showToast('Selamat datang kembali!');
      } catch (err) {
        console.error('Login error:', err);
        loginError.textContent = 'Login gagal: Periksa email dan password.';
        loginError.style.display = 'block';
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await window._firebaseAuth.signOut();
        showToast('Anda telah keluar.');
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }

  // ============================================
  // Tab Navigation (SPA Routing)
  // ============================================
  function switchTab(tabId) {
    currentTab = tabId;
    
    // Update Menu active states
    menuItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });

    // Update Panes visible states
    tabPanels.forEach(panel => {
      panel.style.display = panel.id === `tab-${tabId}` ? 'block' : 'none';
    });

    // Update Header title
    const formattedTitle = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    pageTitle.textContent = formattedTitle === 'Content' ? 'Kelola Konten Website' : formattedTitle;

    // Load data specific to that tab if needed
    if (tabId === 'dashboard') loadStats();
    if (tabId === 'media') loadMedia();
    if (tabId === 'submissions') loadSubmissions();
    if (tabId === 'settings') loadSettings();
  }

  // Bind Menu Click Events
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Bind sub-tabs for Content Manager
  const subTabBtns = document.querySelectorAll('.sub-tab-btn');
  const subtabPanels = document.querySelectorAll('.subtab-panel');

  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetSubtab = btn.getAttribute('data-subtab');
      subtabPanels.forEach(panel => {
        panel.style.display = panel.id === `subtab-${targetSubtab}` ? 'block' : 'none';
      });
    });
  });

  // Expose switchTab to window object for quick navigation calls
  window.switchTab = switchTab;

  // ============================================
  // Data Loaders
  // ============================================
  async function loadAllData() {
    loadStats();
    loadContentSections();
    loadTestimonials();
    loadFaqs();
    loadMedia();
    loadSubmissions();
  }

  async function loadStats() {
    if (token !== "firebase-session-active") return;
    try {
      // Load recent submissions list
      const subSnapshot = await window._firebaseDb.collection('contact_submissions').orderBy('createdAt', 'desc').get();
      submissionsList = subSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Count unread
      const unreadCount = submissionsList.filter(s => !s.read).length;
      document.getElementById('stat-submissions').textContent = submissionsList.length;
      document.getElementById('stat-unread').textContent = unreadCount;
      
      // Update sidebar badge
      if (unreadCount > 0) {
        unreadBadge.textContent = unreadCount;
        unreadBadge.style.display = 'inline-block';
      } else {
        unreadBadge.style.display = 'none';
      }

      renderRecentSubmissionsDashboard();

      // Load media list
      const mediaSnapshot = await window._firebaseDb.collection('media_metadata').orderBy('uploadedAt', 'desc').get();
      mediaList = mediaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      document.getElementById('stat-media').textContent = mediaList.length;
      
    } catch (err) {
      console.error('Stats loading failed', err);
    }
  }

  // ============================================
  // TAB CONTROLLER: CONTENT SECTIONS
  // ============================================
  async function loadContentSections() {
    if (token !== "firebase-session-active") return;
    try {
      const doc = await window._firebaseDb.collection('content').doc('sections').get();
      if (doc.exists) {
        contentData = doc.data();
        populateContentForms();
      }
    } catch (err) {
      console.error('Sections content loading failed', err);
    }
  }

  function populateContentForms() {
    if (!contentData) return;
    
    // 1. Hero
    if (contentData.hero) {
      document.getElementById('hero-badge').value = contentData.hero.badge || '';
      document.getElementById('hero-title').value = contentData.hero.title || '';
      document.getElementById('hero-subtitle').value = contentData.hero.subtitle || '';
      document.getElementById('hero-btn-primary').value = contentData.hero.btnPrimary || '';
      document.getElementById('hero-btn-outline').value = contentData.hero.btnOutline || '';
    }

    // 2. About
    if (contentData.about) {
      document.getElementById('about-title').value = contentData.about.title || '';
      document.getElementById('about-experience').value = contentData.about.experience || '';
      document.getElementById('about-desc1').value = contentData.about.desc1 || '';
      document.getElementById('about-desc2').value = contentData.about.desc2 || '';
      document.getElementById('about-desc3').value = contentData.about.desc3 || '';
    }

    // 3. Visi & Misi
    if (contentData.visi_misi) {
      document.getElementById('visi-text').value = contentData.visi_misi.visi || '';
      renderMisiInputs(contentData.visi_misi.misi || []);
    }

    // 4. Contact
    if (contentData.contact_info) {
      document.getElementById('contact-address').value = contentData.contact_info.address || '';
      document.getElementById('contact-phone').value = contentData.contact_info.phone || '';
      document.getElementById('contact-email').value = contentData.contact_info.email || '';
      document.getElementById('contact-hours').value = contentData.contact_info.hours || '';
      document.getElementById('contact-whatsapp').value = contentData.contact_info.whatsapp || '';
    }
  }

  // --- Sub-Controller: Visi & Misi Lists ---
  const addMisiBtn = document.getElementById('add-misi-btn');
  const misiListInputs = document.getElementById('misi-list-inputs');

  function renderMisiInputs(misiArray) {
    misiListInputs.innerHTML = '';
    misiArray.forEach((misi, index) => {
      addMisiInputField(misi);
    });
  }

  function addMisiInputField(value = '') {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '0.5rem';
    div.innerHTML = `
      <input type="text" class="form-control misi-input" value="${value}" placeholder="Tuliskan misi" required>
      <button type="button" class="btn btn-outline-danger delete-misi-input-btn" style="padding: 0.5rem;"><i data-lucide="trash-2"></i></button>
    `;
    misiListInputs.appendChild(div);
    initIcons();

    // Bind delete button
    div.querySelector('.delete-misi-input-btn').addEventListener('click', () => {
      div.remove();
    });
  }

  if (addMisiBtn) {
    addMisiBtn.addEventListener('click', () => addMisiInputField());
  }

  // Form submits handling
  const formHero = document.getElementById('form-hero');
  const formAbout = document.getElementById('form-about');
  const formVisiMisi = document.getElementById('form-visi-misi');
  const formContact = document.getElementById('form-contact');

  async function updateContentData() {
    if (token !== "firebase-session-active") return;
    try {
      await window._firebaseDb.collection('content').doc('sections').set(contentData);
      showToast('Konten sections berhasil disimpan!');
    } catch (err) {
      console.error(err);
      showToast('Error menyimpan ke database', 'danger');
    }
  }

  if (formHero) {
    formHero.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      contentData.hero = {
        badge: document.getElementById('hero-badge').value,
        title: document.getElementById('hero-title').value,
        subtitle: document.getElementById('hero-subtitle').value,
        btnPrimary: document.getElementById('hero-btn-primary').value,
        btnOutline: document.getElementById('hero-btn-outline').value
      };
      updateContentData();
    });
  }

  if (formAbout) {
    formAbout.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      contentData.about = {
        title: document.getElementById('about-title').value,
        experience: document.getElementById('about-experience').value,
        desc1: document.getElementById('about-desc1').value,
        desc2: document.getElementById('about-desc2').value,
        desc3: document.getElementById('about-desc3').value
      };
      updateContentData();
    });
  }

  if (formVisiMisi) {
    formVisiMisi.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      
      const misiInputs = document.querySelectorAll('.misi-input');
      const misiArray = Array.from(misiInputs).map(input => input.value.trim()).filter(Boolean);
      
      contentData.visi_misi = {
        visi: document.getElementById('visi-text').value,
        misi: misiArray
      };
      updateContentData();
    });
  }

  if (formContact) {
    formContact.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      contentData.contact_info = {
        address: document.getElementById('contact-address').value,
        phone: document.getElementById('contact-phone').value,
        email: document.getElementById('contact-email').value,
        hours: document.getElementById('contact-hours').value,
        whatsapp: document.getElementById('contact-whatsapp').value
      };
      updateContentData();
    });
  }

  // ============================================
  // SUB-CONTROLLER: TESTIMONIALS MANAGER
  // ============================================
  const testimonialsContainer = document.getElementById('testimonials-list-container');
  const addTestimonialBtn = document.getElementById('add-testimonial-btn');

  async function loadTestimonials() {
    try {
      const doc = await window._firebaseDb.collection('content').doc('testimonials').get();
      if (doc.exists) {
        testimonialsList = doc.data().list || [];
        renderTestimonialsEditor();
      }
    } catch (err) {
      console.error('Testimonials loading failed', err);
    }
  }

  function renderTestimonialsEditor() {
    testimonialsContainer.innerHTML = '';
    testimonialsList.forEach((t, index) => {
      const card = document.createElement('div');
      card.className = 'editable-card';
      card.innerHTML = `
        <div class="card-actions-top">
          <button type="button" class="btn btn-outline-danger delete-testi-btn" data-index="${index}" style="padding: 0.5rem;"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="grid-2" style="display: grid; gap: 1rem; grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Nama Pengirim</label>
            <input type="text" class="form-control testi-name" value="${t.name}" required>
          </div>
          <div class="form-group">
            <label>Program / Keterangan</label>
            <input type="text" class="form-control testi-program" value="${t.program}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Isi Testimoni</label>
          <textarea class="form-control testi-text" rows="2" required>${t.text}</textarea>
        </div>
        <div class="grid-2" style="display: grid; gap: 1rem; grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>Rating (1-5)</label>
            <input type="number" class="form-control testi-rating" min="1" max="5" value="${t.rating || 5}" required>
          </div>
          <div class="form-group">
            <label>Avatar Huruf Depan</label>
            <input type="text" class="form-control testi-avatar" maxlength="1" value="${t.avatar || t.name[0]}" required>
          </div>
        </div>
      `;
      testimonialsContainer.appendChild(card);
    });

    initIcons();

    // Bind deletes
    document.querySelectorAll('.delete-testi-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        testimonialsList.splice(index, 1);
        saveTestimonials();
      });
    });

    // Bind change listener on inputs to auto-save local list structure
    testimonialsContainer.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('change', () => {
        // Collect current states
        testimonialsList = [];
        const cards = testimonialsContainer.querySelectorAll('.editable-card');
        cards.forEach(card => {
          testimonialsList.push({
            name: card.querySelector('.testi-name').value,
            program: card.querySelector('.testi-program').value,
            text: card.querySelector('.testi-text').value,
            rating: parseInt(card.querySelector('.testi-rating').value),
            avatar: card.querySelector('.testi-avatar').value
          });
        });
        saveTestimonials(false); // Silent save locally, don't toast
      });
    });
  }

  async function saveTestimonials(showFeedback = true) {
    if (token !== "firebase-session-active") return;
    try {
      await window._firebaseDb.collection('content').doc('testimonials').set({ list: testimonialsList });
      if (showFeedback) {
        showToast('Testimoni berhasil disimpan!');
        loadTestimonials();
      }
    } catch (err) {
      if (showFeedback) showToast('Gagal menyimpan testimoni', 'danger');
      console.error(err);
    }
  }

  if (addTestimonialBtn) {
    addTestimonialBtn.addEventListener('click', () => {
      testimonialsList.push({
        name: 'Nama Alumni Baru',
        program: 'Peserta Excavator Batch 10',
        text: 'Tulis isi testimoni di sini...',
        rating: 5,
        avatar: 'N'
      });
      renderTestimonialsEditor();
      saveTestimonials(false); // Save initial template
    });
  }

  // ============================================
  // SUB-CONTROLLER: FAQ MANAGER
  // ============================================
  const faqContainer = document.getElementById('faq-list-container');
  const addFaqBtn = document.getElementById('add-faq-btn');

  async function loadFaqs() {
    if (token !== "firebase-session-active") return;
    try {
      const doc = await window._firebaseDb.collection('content').doc('faqs').get();
      if (doc.exists) {
        faqList = doc.data().list || [];
        renderFaqEditor();
      }
    } catch (err) {
      console.error('FAQ loading failed', err);
    }
  }

  function renderFaqEditor() {
    faqContainer.innerHTML = '';
    faqList.forEach((faq, index) => {
      const card = document.createElement('div');
      card.className = 'editable-card';
      card.innerHTML = `
        <div class="card-actions-top">
          <button type="button" class="btn btn-outline-danger delete-faq-btn" data-index="${index}" style="padding: 0.5rem;"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="form-group" style="padding-right: 2.5rem;">
          <label>Pertanyaan</label>
          <input type="text" class="form-control faq-q" value="${faq.question}" required>
        </div>
        <div class="form-group">
          <label>Jawaban</label>
          <textarea class="form-control faq-a" rows="3" required>${faq.answer}</textarea>
        </div>
      `;
      faqContainer.appendChild(card);
    });

    initIcons();

    // Bind deletes
    document.querySelectorAll('.delete-faq-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        faqList.splice(index, 1);
        saveFaq();
      });
    });

    // Bind change listener on inputs
    faqContainer.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('change', () => {
        faqList = [];
        const cards = faqContainer.querySelectorAll('.editable-card');
        cards.forEach(card => {
          faqList.push({
            question: card.querySelector('.faq-q').value,
            answer: card.querySelector('.faq-a').value
          });
        });
        saveFaq(false); // Silent save locally
      });
    });
  }

  async function saveFaq(showFeedback = true) {
    if (token !== "firebase-session-active") return;
    try {
      await window._firebaseDb.collection('content').doc('faqs').set({ list: faqList });
      if (showFeedback) {
        showToast('FAQ berhasil disimpan!');
        loadFaqs();
      }
    } catch (err) {
      if (showFeedback) showToast('Gagal menyimpan FAQ', 'danger');
      console.error(err);
    }
  }

  if (addFaqBtn) {
    addFaqBtn.addEventListener('click', () => {
      faqList.push({
        question: 'Pertanyaan baru?',
        answer: 'Jawaban baru di sini...'
      });
      renderFaqEditor();
      saveFaq(false); // Save initial template
    });
  }

  // ============================================
  // TAB CONTROLLER: MEDIA MANAGER
  // ============================================
  const mediaGalleryGrid = document.getElementById('media-gallery-grid');
  const uploadDropzone = document.getElementById('upload-dropzone');
  const mediaFileInput = document.getElementById('media-file-input');
  const refreshMediaBtn = document.getElementById('refresh-media-btn');
  
  const uploadProgressContainer = document.getElementById('upload-progress-container');
  const uploadProgressBar = document.getElementById('upload-progress-bar');
  const uploadStatusText = document.getElementById('upload-status-text');

  async function loadMedia() {
    if (token !== "firebase-session-active") return;
    try {
      const snapshot = await window._firebaseDb.collection('media_metadata').orderBy('uploadedAt', 'desc').get();
      mediaList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderMediaGallery();
    } catch (err) {
      console.error('Media load failed', err);
    }
  }

  function renderMediaGallery() {
    mediaGalleryGrid.innerHTML = '';
    
    if (mediaList.length === 0) {
      mediaGalleryGrid.innerHTML = '<div style="grid-column: span 12; text-align: center; color: var(--text-gray-500); padding: 3rem;">Belum ada media yang diupload</div>';
      return;
    }

    mediaList.forEach(media => {
      const item = document.createElement('div');
      item.className = 'media-item';
      
      const kbSize = (media.size / 1024).toFixed(1);
      const date = new Date(media.createdAt).toLocaleDateString('id-ID');

      item.innerHTML = `
        <img src="${media.url}" alt="${media.name}">
        <div class="media-item-info">
          <h4>${media.name}</h4>
          <p>${kbSize} KB • ${date}</p>
          <div class="media-item-actions">
            <button class="btn btn-primary btn-sm copy-url-btn" data-url="${media.url}">Salin URL</button>
            <button class="btn btn-danger btn-sm delete-media-btn" data-id="${media.id}">Hapus</button>
          </div>
        </div>
      `;
      mediaGalleryGrid.appendChild(item);
    });

    // Copy URL binding
    document.querySelectorAll('.copy-url-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = window.location.origin + btn.getAttribute('data-url');
        navigator.clipboard.writeText(url).then(() => {
          showToast('URL disalin ke clipboard');
        });
      });
    });

    // Delete binding
    document.querySelectorAll('.delete-media-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm('Apakah Anda yakin ingin menghapus gambar ini secara permanen?')) {
          try {
            // Find media doc
            const doc = await window._firebaseDb.collection('media_metadata').doc(id).get();
            if (doc.exists) {
              const data = doc.data();
              // Delete from storage if path exists
              if (data.storagePath) {
                const storageRef = window._firebaseStorage.ref(data.storagePath);
                await storageRef.delete().catch(() => {});
              }
              // Delete metadata from firestore
              await window._firebaseDb.collection('media_metadata').doc(id).delete();
            }
            showToast('Media berhasil dihapus');
            loadMedia();
            loadStats();
          } catch (err) {
            console.error(err);
            showToast('Gagal menghapus media', 'danger');
          }
        }
      });
    });
  }

  // --- File Upload Handling ---
  if (uploadDropzone) {
    uploadDropzone.addEventListener('click', () => mediaFileInput.click());

    // Drag-over highlights
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('dragover');
      }, false);
    });

    // Drop file
    uploadDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    });

    // Choose file input
    mediaFileInput.addEventListener('change', () => {
      if (mediaFileInput.files.length > 0) {
        uploadFile(mediaFileInput.files[0]);
      }
    });
  }

  async function uploadFile(file) {
    if (token !== "firebase-session-active") return;
    
    uploadProgressContainer.style.display = 'block';
    uploadProgressBar.style.width = '0%';
    uploadStatusText.textContent = `Mengupload ${file.name}...`;

    try {
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `uploads/${filename}`;
      const storageRef = window._firebaseStorage.ref(storagePath);
      
      const uploadTask = storageRef.put(file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          uploadProgressBar.style.width = `${percent}%`;
        }, 
        (err) => {
          console.error('Upload error:', err);
          uploadProgressContainer.style.display = 'none';
          showToast('Upload gagal', 'danger');
        }, 
        async () => {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          
          // Save metadata to Firestore
          await window._firebaseDb.collection('media_metadata').add({
            name: file.name,
            url: downloadURL,
            storagePath: storagePath,
            size: file.size,
            uploadedAt: new Date().toISOString()
          });

          uploadProgressContainer.style.display = 'none';
          showToast('Gambar berhasil diupload!');
          loadMedia();
          loadStats();
        }
      );

    } catch (err) {
      console.error(err);
      uploadProgressContainer.style.display = 'none';
      showToast('Error saat upload file', 'danger');
    }
  }

  if (refreshMediaBtn) refreshMediaBtn.addEventListener('click', loadMedia);

  // ============================================
  // TAB CONTROLLER: FORM SUBMISSIONS
  // ============================================
  const submissionsTableBody = document.getElementById('submissions-table-body');
  const recentSubmissionsBody = document.getElementById('recent-submissions-body');
  const refreshSubmissionsBtn = document.getElementById('refresh-submissions-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');

  async function loadSubmissions() {
    if (token !== "firebase-session-active") return;
    try {
      const snapshot = await window._firebaseDb.collection('contact_submissions').orderBy('createdAt', 'desc').get();
      submissionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderSubmissionsTable();
      loadStats(); // keep badge and counters fresh
    } catch (err) {
      console.error('Submissions load failed', err);
    }
  }

  function renderSubmissionsTable() {
    submissionsTableBody.innerHTML = '';
    
    if (submissionsList.length === 0) {
      submissionsTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada pesan masuk</td></tr>';
      return;
    }

    submissionsList.forEach(sub => {
      const row = document.createElement('tr');
      const dateStr = new Date(sub.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
      
      const badgeClass = sub.read ? 'badge-status-read' : 'badge-status-unread';
      const badgeText = sub.read ? 'Dibaca' : 'Belum Dibaca';

      row.innerHTML = `
        <td>${dateStr}</td>
        <td><strong>${sub.name}</strong></td>
        <td>${sub.email}</td>
        <td>${sub.phone}</td>
        <td>${sub.program}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td>
          <button class="btn btn-outline btn-sm view-sub-btn" data-id="${sub.id}">Detail</button>
          <button class="btn btn-outline-danger btn-sm delete-sub-btn" data-id="${sub.id}"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
        </td>
      `;
      submissionsTableBody.appendChild(row);
    });

    initIcons();

    // Bind row actions
    document.querySelectorAll('.view-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openSubmissionModal(id);
      });
    });

    document.querySelectorAll('.delete-sub-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm('Apakah Anda yakin ingin menghapus pesan ini secara permanen?')) {
          await deleteSubmission(id);
        }
      });
    });
  }

  function renderRecentSubmissionsDashboard() {
    recentSubmissionsBody.innerHTML = '';
    
    const recentList = submissionsList.slice(0, 5);
    
    if (recentList.length === 0) {
      recentSubmissionsBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada pesan masuk baru</td></tr>';
      return;
    }

    recentList.forEach(sub => {
      const row = document.createElement('tr');
      const dateStr = new Date(sub.createdAt).toLocaleDateString('id-ID');
      
      const badgeClass = sub.read ? 'badge-status-read' : 'badge-status-unread';
      const badgeText = sub.read ? 'Dibaca' : 'Belum Dibaca';

      row.innerHTML = `
        <td><strong>${sub.name}</strong></td>
        <td>${sub.program}</td>
        <td>${dateStr}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openSubmissionModal('${sub.id}')">Detail</button>
        </td>
      `;
      recentSubmissionsBody.appendChild(row);
    });
  }

  // Submission Detail Modal
  async function openSubmissionModal(id) {
    const sub = submissionsList.find(item => item.id === id);
    if (!sub) return;

    // Populate modal fields
    document.getElementById('modal-date').textContent = new Date(sub.createdAt).toLocaleString('id-ID');
    document.getElementById('modal-name').textContent = sub.name;
    document.getElementById('modal-email').innerHTML = `<a href="mailto:${sub.email}" style="color:var(--primary);text-decoration:underline;">${sub.email}</a>`;
    document.getElementById('modal-phone').innerHTML = `<a href="tel:${sub.phone}" style="color:var(--primary);text-decoration:underline;">${sub.phone}</a>`;
    document.getElementById('modal-program').textContent = sub.program;
    document.getElementById('modal-message').textContent = sub.message;

    // Action button states
    const markReadBtn = document.getElementById('modal-mark-read-btn');
    if (sub.read) {
      markReadBtn.style.display = 'none';
    } else {
      markReadBtn.style.display = 'inline-flex';
      markReadBtn.onclick = async () => {
        await markSubmissionRead(id);
        submissionModal.style.display = 'none';
      };
    }

    document.getElementById('modal-delete-btn').onclick = async () => {
      if (confirm('Hapus pesan ini secara permanen?')) {
        await deleteSubmission(id);
        submissionModal.style.display = 'none';
      }
    };

    submissionModal.style.display = 'flex';
    
    // Automatically mark read in database when opened
    if (!sub.read) {
      await markSubmissionRead(id, false); // silent mark read
    }
  }

  // Expose openSubmissionModal globally for dashboard quickview
  window.openSubmissionModal = openSubmissionModal;

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      submissionModal.style.display = 'none';
    });
  }

  // Close modal when click outside content
  if (submissionModal) {
    submissionModal.addEventListener('click', (e) => {
      if (e.target === submissionModal) submissionModal.style.display = 'none';
    });
  }

  async function markSubmissionRead(id, reload = true) {
    if (token !== "firebase-session-active") return;
    try {
      await window._firebaseDb.collection('contact_submissions').doc(id).update({ read: true });
      if (reload) {
        showToast('Pesan ditandai sebagai dibaca');
        loadSubmissions();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteSubmission(id) {
    if (token !== "firebase-session-active") return;
    try {
      await window._firebaseDb.collection('contact_submissions').doc(id).delete();
      showToast('Pesan berhasil dihapus');
      loadSubmissions();
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus pesan', 'danger');
    }
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (token !== "firebase-session-active") return;
      try {
        if (!submissionsList || submissionsList.length === 0) {
          showToast('Tidak ada data untuk diekspor', 'danger');
          return;
        }
        
        let csvContent = "data:text/csv;charset=utf-8,ID,Tanggal,Nama,Email,Telepon,Program,Status,Pesan\n";
        submissionsList.forEach(s => {
          const row = [
            s.id,
            `"${s.createdAt || ''}"`,
            `"${(s.name || '').replace(/"/g, '""')}"`,
            `"${(s.email || '').replace(/"/g, '""')}"`,
            `"${(s.phone || '').replace(/"/g, '""')}"`,
            `"${(s.program || '').replace(/"/g, '""')}"`,
            s.read ? 'Dibaca' : 'Belum Dibaca',
            `"${(s.message || '').replace(/"/g, '""')}"`
          ].join(",");
          csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "pesan_masuk_heti.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('File CSV berhasil diekspor!');
      } catch (err) {
        console.error(err);
        showToast('Gagal mengekspor CSV', 'danger');
      }
    });
  }

  if (refreshSubmissionsBtn) refreshSubmissionsBtn.addEventListener('click', loadSubmissions);

  // ============================================
  // TAB CONTROLLER: SETTINGS
  // ============================================
  const formSiteSettings = document.getElementById('form-site-settings');
  const formChangePassword = document.getElementById('form-change-password');

  async function loadSettings() {
    try {
      const doc = await window._firebaseDb.collection('settings').doc('site').get();
      if (doc.exists) {
        const data = doc.data();
        document.getElementById('settings-title').value = data.siteTitle || '';
        document.getElementById('settings-description').value = data.metaDescription || '';
      }
      if (window._firebaseAuth && window._firebaseAuth.currentUser) {
        document.getElementById('settings-username').value = window._firebaseAuth.currentUser.email;
      }
    } catch (err) {
      console.error('Settings load failed', err);
    }
  }

  if (formSiteSettings) {
    formSiteSettings.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (token !== "firebase-session-active") return;

      const siteTitle = document.getElementById('settings-title').value;
      const metaDescription = document.getElementById('settings-description').value;

      try {
        await window._firebaseDb.collection('settings').doc('site').set({
          siteTitle,
          metaDescription,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        showToast('Pengaturan diperbarui!');
      } catch (err) {
        console.error(err);
        showToast('Gagal menyimpan pengaturan', 'danger');
      }
    });
  }

  if (formChangePassword) {
    formChangePassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (token !== "firebase-session-active" || !window._firebaseAuth.currentUser) return;

      const oldPassword = document.getElementById('password-old').value;
      const newPassword = document.getElementById('password-new').value;
      const confirmPassword = document.getElementById('password-confirm').value;

      if (newPassword !== confirmPassword) {
        showToast('Password baru dan konfirmasi tidak sesuai!', 'danger');
        return;
      }

      try {
        const user = window._firebaseAuth.currentUser;
        
        // Re-authenticate user before changing password
        const credential = window._firebaseAuth.EmailAuthProvider.credential(user.email, oldPassword);
        await user.reauthenticateWithCredential(credential);

        // Update password
        await user.updatePassword(newPassword);

        showToast('Password berhasil diubah!');
        formChangePassword.reset();
      } catch (err) {
        console.error('Password change error:', err);
        showToast('Gagal mengubah password. Pastikan password lama benar.', 'danger');
      }
    });
  }

  // Start check session on page load
  checkSession();
});
