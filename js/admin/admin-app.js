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
  // Authentication & Session
  // ============================================
  async function checkSession() {
    if (!token) {
      showLoginView();
      return;
    }

    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        userDisplay.textContent = data.username;
        showAdminLayout();
        loadAllData();
      } else {
        localStorage.removeItem('heti_admin_token');
        token = null;
        showLoginView();
      }
    } catch (err) {
      console.error('Session check failed:', err);
      // If server is offline, keep the layout but warn the admin
      showToast('Koneksi ke server gagal, menggunakan cache lokal.', 'danger');
      showAdminLayout();
    }
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

      const usernameInput = document.getElementById('login-username').value;
      const passwordInput = document.getElementById('login-password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await res.json();

        if (res.ok) {
          token = data.token;
          localStorage.setItem('heti_admin_token', token);
          userDisplay.textContent = data.username;
          showToast('Selamat datang kembali!');
          showAdminLayout();
          loadAllData();
        } else {
          loginError.textContent = data.message || 'Login gagal';
          loginError.style.display = 'block';
        }
      } catch (err) {
        loginError.textContent = 'Server tidak merespons. Pastikan backend server aktif.';
        loginError.style.display = 'block';
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('heti_admin_token');
      token = null;
      showToast('Anda telah keluar.');
      showLoginView();
    });
  }

  // ============================================
  // Tab Navigation (SPA Routing)
  // ============================================
  function switchTab(tabId) {
    currentTab = tabId;
    
    // Alias 'content' to 'lpk-content' for backward compatibility
    let targetTabId = tabId;
    if (tabId === 'content') targetTabId = 'lpk-content';

    // Update Menu active states
    menuItems.forEach(item => {
      const itemTab = item.getAttribute('data-tab');
      item.classList.toggle('active', itemTab === tabId || itemTab === targetTabId);
    });

    // Update Panes visible states
    tabPanels.forEach(panel => {
      panel.style.display = panel.id === `tab-${targetTabId}` ? 'block' : 'none';
    });

    // Update Header title
    const titles = {
      'dashboard': 'Dashboard — Overview BIN Group',
      'bin-holding': 'Company Profile Buwas Ikigai Nusantara',
      'lpk-content': 'Kelola Konten LPK Buwas Ikigai Nusantara',
      'procool-content': 'Kelola Landing Page Procool (HVAC)',
      'legal-content': 'Kelola Landing Page Konsultasi Hukum',
      'geoteknik-content': 'Kelola Landing Page Jasa Geoteknik',
      'articles': 'Kelola Artikel & Insight',
      'gallery': 'Kelola Galeri & Portofolio',
      'partners': 'Kelola Mitra & Partner',
      'media': 'Media Manager',
      'submissions': 'Pesan Masuk (All Unit Services)',
      'settings': 'Pengaturan Global Website'
    };
    pageTitle.textContent = titles[targetTabId] || 'Admin Dashboard';

    // Load data specific to that tab if needed
    if (tabId === 'dashboard') loadStats();
    if (tabId === 'gallery') loadGallery();
    if (tabId === 'partners') loadPartners();
    if (tabId === 'media') loadMedia();
    if (tabId === 'submissions') loadSubmissions();
    if (tabId === 'settings') loadSettings();
    if (tabId === 'lpk-content') loadPageGallery('lpk');
    if (tabId === 'procool-content') loadPageGallery('procool');
    if (tabId === 'legal-content') loadPageGallery('legal');
    if (tabId === 'geoteknik-content') loadPageGallery('geoteknik');
  }

  // Bind Menu Click Events
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Bind scoped sub-tabs for each tab section
  document.querySelectorAll('.tab-panel').forEach(tabSection => {
    const sBtns = tabSection.querySelectorAll('.sub-tab-btn');
    const sPanels = tabSection.querySelectorAll('.subtab-panel');
    if (sBtns.length === 0) return;

    sBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetSubtab = btn.getAttribute('data-subtab');
        sPanels.forEach(panel => {
          panel.style.display = panel.id === `subtab-${targetSubtab}` ? 'block' : 'none';
        });
        initIcons();

        // If gallery subtab, ensure gallery data is loaded & rendered
        if (targetSubtab.includes('gallery')) {
          if (targetSubtab.includes('lpk')) loadPageGallery('lpk');
          else if (targetSubtab.includes('procool')) loadPageGallery('procool');
          else if (targetSubtab.includes('legal')) loadPageGallery('legal');
          else if (targetSubtab.includes('geoteknik')) loadPageGallery('geoteknik');
        }
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
    loadGallery();
    loadAllPageGalleries();
    loadPartners();
    loadMedia();
    loadSubmissions();
  }

  let allSubmissionsList = [];

  async function loadStats() {
    if (!token) return;
    try {
      // Load recent submissions list
      const subRes = await fetch('/api/contact', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) {
        allSubmissionsList = await subRes.json();
        
        // Count unread
        const unreadCount = allSubmissionsList.filter(s => !s.read).length;
        document.getElementById('stat-submissions').textContent = allSubmissionsList.length;
        document.getElementById('stat-unread').textContent = unreadCount;
        
        // Update sidebar badge
        if (unreadBadge) {
          if (unreadCount > 0) {
            unreadBadge.textContent = unreadCount;
            unreadBadge.style.display = 'inline-block';
          } else {
            unreadBadge.style.display = 'none';
          }
        }

        renderRecentSubmissionsDashboard();
      }

      // Load media list
      const mediaRes = await fetch('/api/media', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (mediaRes.ok) {
        mediaList = await mediaRes.json();
        document.getElementById('stat-media').textContent = mediaList.length;
      }
    } catch (err) {
      console.error('Stats loading failed', err);
    }
  }

  // ============================================
  // TAB CONTROLLER: CONTENT SECTIONS
  // ============================================
  async function loadContentSections() {
    try {
      const res = await fetch('/api/content/sections');
      if (res.ok) {
        contentData = await res.json();
        populateContentForms();
      }
    } catch (err) {
      console.error('Sections content loading failed', err);
    }
  }

  function populateContentForms() {
    if (!contentData) return;
    
    // 1. Hero (LPK)
    if (contentData.hero) {
      document.getElementById('hero-badge').value = contentData.hero.badge || '';
      document.getElementById('hero-title').value = contentData.hero.title || '';
      document.getElementById('hero-subtitle').value = contentData.hero.subtitle || '';
      document.getElementById('hero-btn-primary').value = contentData.hero.btnPrimary || '';
      document.getElementById('hero-btn-outline').value = contentData.hero.btnOutline || '';
      const lpkHeroImg = document.getElementById('lpk-input-hero-image');
      if (lpkHeroImg) {
        lpkHeroImg.value = contentData.hero.bg_image || '';
        const prev = document.getElementById('lpk-img-hero-preview');
        if (prev && contentData.hero.bg_image) prev.src = contentData.hero.bg_image;
      }
    }

    // 2. About (LPK)
    if (contentData.about) {
      document.getElementById('about-title').value = contentData.about.title || '';
      document.getElementById('about-experience').value = contentData.about.experience || '';
      document.getElementById('about-desc1').value = contentData.about.desc1 || '';
      document.getElementById('about-desc2').value = contentData.about.desc2 || '';
      document.getElementById('about-desc3').value = contentData.about.desc3 || '';
      const lpkImgInput = document.getElementById('about-image');
      if (lpkImgInput) {
        lpkImgInput.value = contentData.about.image || '';
        const prev = document.getElementById('lpk-img-about-preview');
        if (prev && contentData.about.image) prev.src = contentData.about.image;
      }
    }

    // 3. Visi & Misi
    if (contentData.visi_misi) {
      document.getElementById('visi-text').value = contentData.visi_misi.visi || '';
      renderMisiInputs(contentData.visi_misi.misi || []);
    }

    // 4. Contact (LPK)
    if (contentData.contact_info) {
      document.getElementById('contact-address').value = contentData.contact_info.address || '';
      document.getElementById('contact-phone').value = contentData.contact_info.phone || '';
      document.getElementById('contact-email').value = contentData.contact_info.email || '';
      document.getElementById('contact-hours').value = contentData.contact_info.hours || '';
      document.getElementById('contact-whatsapp').value = contentData.contact_info.whatsapp || '';
    }

    // 5. BIN Holding
    if (contentData.bin) {
      if (contentData.bin.hero) {
        const bBadge = document.getElementById('bin-input-hero-badge');
        const bTitle = document.getElementById('bin-input-hero-title');
        const bSub = document.getElementById('bin-input-hero-subtitle');
        const bHeroImg = document.getElementById('bin-input-hero-image');
        const bHeroPrev = document.getElementById('bin-img-hero-preview');
        if (bBadge) bBadge.value = contentData.bin.hero.badge || '';
        if (bTitle) bTitle.value = contentData.bin.hero.title || '';
        if (bSub) bSub.value = contentData.bin.hero.subtitle || '';
        if (bHeroImg) bHeroImg.value = contentData.bin.hero.bg_image || '';
        if (bHeroPrev && contentData.bin.hero.bg_image) bHeroPrev.src = contentData.bin.hero.bg_image;
      }
      if (contentData.bin.about) {
        const bAtitle = document.getElementById('bin-input-about-title');
        const bAdesc1 = document.getElementById('bin-input-about-desc1');
        const bAdesc2 = document.getElementById('bin-input-about-desc2');
        const bAimg = document.getElementById('bin-input-about-image');
        const bAprev = document.getElementById('bin-img-about-preview');
        if (bAtitle) bAtitle.value = contentData.bin.about.title || '';
        if (bAdesc1) bAdesc1.value = contentData.bin.about.desc1 || '';
        if (bAdesc2) bAdesc2.value = contentData.bin.about.desc2 || '';
        if (bAimg) bAimg.value = contentData.bin.about.image || '';
        if (bAprev && contentData.bin.about.image) bAprev.src = contentData.bin.about.image;
      }
      if (contentData.bin.contact_info) {
        const bAddr = document.getElementById('bin-input-contact-address');
        const bPhone = document.getElementById('bin-input-contact-phone');
        const bEmail = document.getElementById('bin-input-contact-email');
        const bHours = document.getElementById('bin-input-contact-hours');
        if (bAddr) bAddr.value = contentData.bin.contact_info.address || '';
        if (bPhone) bPhone.value = contentData.bin.contact_info.phone || '';
        if (bEmail) bEmail.value = contentData.bin.contact_info.email || '';
        if (bHours) bHours.value = contentData.bin.contact_info.hours || '';
      }
    }

    // 6. Procool
    if (contentData.procool) {
      if (contentData.procool.hero) {
        const pTitle = document.getElementById('procool-input-hero-title');
        const pSub = document.getElementById('procool-input-hero-subtitle');
        const pHeroImg = document.getElementById('procool-input-hero-image');
        const pHeroPrev = document.getElementById('procool-img-hero-preview');
        if (pTitle) pTitle.value = contentData.procool.hero.title || '';
        if (pSub) pSub.value = contentData.procool.hero.subtitle || '';
        if (pHeroImg) pHeroImg.value = contentData.procool.hero.bg_image || '';
        if (pHeroPrev && contentData.procool.hero.bg_image) pHeroPrev.src = contentData.procool.hero.bg_image;
      }
      if (contentData.procool.about) {
        const pAtitle = document.getElementById('procool-input-about-title');
        const pAdesc1 = document.getElementById('procool-input-about-desc1');
        const pAdesc2 = document.getElementById('procool-input-about-desc2');
        const pAimg = document.getElementById('procool-input-about-image');
        const pAprev = document.getElementById('procool-img-about-preview');
        if (pAtitle) pAtitle.value = contentData.procool.about.title || '';
        if (pAdesc1) pAdesc1.value = contentData.procool.about.desc1 || '';
        if (pAdesc2) pAdesc2.value = contentData.procool.about.desc2 || '';
        if (pAimg) pAimg.value = contentData.procool.about.image || '';
        if (pAprev && contentData.procool.about.image) pAprev.src = contentData.procool.about.image;
      }
      if (contentData.procool.contact_info) {
        const pPhone = document.getElementById('procool-input-contact-phone');
        const pEmail = document.getElementById('procool-input-contact-email');
        const pHours = document.getElementById('procool-input-contact-hours');
        if (pPhone) pPhone.value = contentData.procool.contact_info.phone || '';
        if (pEmail) pEmail.value = contentData.procool.contact_info.email || '';
        if (pHours) pHours.value = contentData.procool.contact_info.hours || '';
      }
    }

    // 7. Legal
    if (contentData.legal) {
      if (contentData.legal.hero) {
        const lTitle = document.getElementById('legal-input-hero-title');
        const lSub = document.getElementById('legal-input-hero-subtitle');
        const lHeroImg = document.getElementById('legal-input-hero-image');
        const lHeroPrev = document.getElementById('legal-img-hero-preview');
        if (lTitle) lTitle.value = contentData.legal.hero.title || '';
        if (lSub) lSub.value = contentData.legal.hero.subtitle || '';
        if (lHeroImg) lHeroImg.value = contentData.legal.hero.bg_image || '';
        if (lHeroPrev && contentData.legal.hero.bg_image) lHeroPrev.src = contentData.legal.hero.bg_image;
      }
      if (contentData.legal.about) {
        const lAtitle = document.getElementById('legal-input-about-title');
        const lAdesc1 = document.getElementById('legal-input-about-desc1');
        const lAdesc2 = document.getElementById('legal-input-about-desc2');
        const lAimg = document.getElementById('legal-input-about-image');
        const lAprev = document.getElementById('legal-img-about-preview');
        if (lAtitle) lAtitle.value = contentData.legal.about.title || '';
        if (lAdesc1) lAdesc1.value = contentData.legal.about.desc1 || '';
        if (lAdesc2) lAdesc2.value = contentData.legal.about.desc2 || '';
        if (lAimg) lAimg.value = contentData.legal.about.image || '';
        if (lAprev && contentData.legal.about.image) lAprev.src = contentData.legal.about.image;
      }
      if (contentData.legal.contact_info) {
        const lPhone = document.getElementById('legal-input-contact-phone');
        const lEmail = document.getElementById('legal-input-contact-email');
        const lHours = document.getElementById('legal-input-contact-hours');
        if (lPhone) lPhone.value = contentData.legal.contact_info.phone || '';
        if (lEmail) lEmail.value = contentData.legal.contact_info.email || '';
        if (lHours) lHours.value = contentData.legal.contact_info.hours || '';
      }
    }

    // 8. Geoteknik
    if (contentData.geoteknik) {
      if (contentData.geoteknik.hero) {
        const gTitle = document.getElementById('geoteknik-input-hero-title');
        const gSub = document.getElementById('geoteknik-input-hero-subtitle');
        const gHeroImg = document.getElementById('geoteknik-input-hero-image');
        const gHeroPrev = document.getElementById('geoteknik-img-hero-preview');
        if (gTitle) gTitle.value = contentData.geoteknik.hero.title || '';
        if (gSub) gSub.value = contentData.geoteknik.hero.subtitle || '';
        if (gHeroImg) gHeroImg.value = contentData.geoteknik.hero.bg_image || '';
        if (gHeroPrev && contentData.geoteknik.hero.bg_image) gHeroPrev.src = contentData.geoteknik.hero.bg_image;
      }
      if (contentData.geoteknik.about) {
        const gAtitle = document.getElementById('geoteknik-input-about-title');
        const gAdesc1 = document.getElementById('geoteknik-input-about-desc1');
        const gAdesc2 = document.getElementById('geoteknik-input-about-desc2');
        const gAimg = document.getElementById('geoteknik-input-about-image');
        const gAprev = document.getElementById('geoteknik-img-about-preview');
        if (gAtitle) gAtitle.value = contentData.geoteknik.about.title || '';
        if (gAdesc1) gAdesc1.value = contentData.geoteknik.about.desc1 || '';
        if (gAdesc2) gAdesc2.value = contentData.geoteknik.about.desc2 || '';
        if (gAimg) gAimg.value = contentData.geoteknik.about.image || '';
        if (gAprev && contentData.geoteknik.about.image) gAprev.src = contentData.geoteknik.about.image;
      }
      if (contentData.geoteknik.contact_info) {
        const gPhone = document.getElementById('geoteknik-input-contact-phone');
        const gEmail = document.getElementById('geoteknik-input-contact-email');
        const gHours = document.getElementById('geoteknik-input-contact-hours');
        if (gPhone) gPhone.value = contentData.geoteknik.contact_info.phone || '';
        if (gEmail) gEmail.value = contentData.geoteknik.contact_info.email || '';
        if (gHours) gHours.value = contentData.geoteknik.contact_info.hours || '';
      }
    }

    attachVisualToolbars();
  }

  function attachVisualToolbars() {
    const fields = [
      { id: 'bin-input-hero-title', previewId: 'bin-hero-title-preview', color: '#F59E0B' },
      { id: 'procool-input-hero-title', previewId: 'procool-hero-title-preview', color: '#60A5FA' },
      { id: 'legal-input-hero-title', previewId: 'legal-hero-title-preview', color: '#C084FC' },
      { id: 'geoteknik-input-hero-title', previewId: 'geoteknik-hero-title-preview', color: '#34D399' },
      { id: 'hero-title', previewId: 'lpk-hero-title-preview', color: '#F59E0B' }
    ];

    fields.forEach(f => {
      const input = document.getElementById(f.id);
      if (!input) return;

      if (input.dataset.toolbarAttached) return;
      input.dataset.toolbarAttached = 'true';

      const toolbar = document.createElement('div');
      toolbar.className = 'text-editor-toolbar';
      toolbar.style.cssText = 'display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.5rem; background:rgba(255,255,255,0.03); padding:0.4rem 0.6rem; border-radius:6px; border:1px solid var(--border-dark); align-items:center;';

      toolbar.innerHTML = `
        <span style="font-size:0.75rem; font-weight:600; color:var(--text-light); margin-right:0.25rem;">Toolbar Format:</span>
        <button type="button" class="btn btn-outline btn-sm bold-text-btn" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
          <b>B</b> Tebal
        </button>
        <button type="button" class="btn btn-outline btn-sm italic-text-btn" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
          <i>I</i> Miring
        </button>
        <button type="button" class="btn btn-outline-danger btn-sm clear-html-btn" style="padding:0.25rem 0.6rem; font-size:0.75rem;" title="Hapus Semua Format Warna/HTML">
          Hapus Format Teks
        </button>
      `;

      input.parentNode.insertBefore(toolbar, input);

      let previewBox = document.getElementById(f.previewId);
      if (!previewBox) {
        previewBox = document.createElement('div');
        previewBox.id = f.previewId;
        previewBox.style.cssText = 'margin-top:0.5rem; padding:0.75rem 1rem; background:rgba(0,0,0,0.3); border:1px dashed var(--border-dark); border-radius:6px; font-size:1.1rem; font-weight:700; color:#fff; line-height:1.4;';
        input.parentNode.appendChild(previewBox);
      }

      const updatePreview = () => {
        const val = input.value || '';
        previewBox.innerHTML = '<span style="font-size:0.7rem; font-weight:400; color:var(--text-light); display:block; margin-bottom:4px;">Pratinjau Tampilan di Website:</span>' + (val || '<em>(Kosong)</em>');
      };

      input.addEventListener('input', updatePreview);
      updatePreview();

      const boldBtn = toolbar.querySelector('.bold-text-btn');
      const italicBtn = toolbar.querySelector('.italic-text-btn');
      const clearBtn = toolbar.querySelector('.clear-html-btn');

      boldBtn.addEventListener('click', () => {
        wrapSelection(input, '<b>', '</b>');
        updatePreview();
      });

      italicBtn.addEventListener('click', () => {
        wrapSelection(input, '<i>', '</i>');
        updatePreview();
      });

      clearBtn.addEventListener('click', () => {
        const tmp = document.createElement('div');
        tmp.innerHTML = input.value;
        input.value = tmp.textContent || tmp.innerText || '';
        updatePreview();
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function openColorHighlightPicker(input, defaultColor = '#60A5FA', updateCallback) {
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selectedText = input.value.substring(start, end);

    let targetWord = selectedText;
    if (!targetWord) {
      targetWord = prompt('Ketik kata/frasa yang ingin diberi warna highlight (contoh: Sistem Pendingin):');
      if (!targetWord || !targetWord.trim()) return;
      targetWord = targetWord.trim();
    }

    const colors = [
      { name: '🔵 Biru Procool (#60A5FA)', code: '#60A5FA' },
      { name: '🟣 Ungu Legal (#C084FC)', code: '#C084FC' },
      { name: '🟢 Hijau Geoteknik (#34D399)', code: '#34D399' },
      { name: '🟡 Emas BIN Group (#F59E0B)', code: '#F59E0B' },
      { name: '🔴 Merah Akses (#EF4444)', code: '#EF4444' }
    ];

    let colorPrompt = 'Pilih nomor warna highlight untuk "' + targetWord + '":\n';
    colors.forEach((c, idx) => {
      colorPrompt += `${idx + 1}. ${c.name}\n`;
    });

    const choice = prompt(colorPrompt, '1');
    if (!choice) return;

    const selectedIdx = parseInt(choice) - 1;
    const chosenColor = colors[selectedIdx] ? colors[selectedIdx].code : defaultColor;

    const highlighted = `<span style="color: ${chosenColor};">${targetWord}</span>`;

    if (selectedText) {
      input.value = input.value.substring(0, start) + highlighted + input.value.substring(end);
    } else {
      if (input.value.includes(targetWord)) {
        input.value = input.value.replace(targetWord, highlighted);
      } else {
        input.value = input.value + ' ' + highlighted;
      }
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof updateCallback === 'function') updateCallback();
  }

  function wrapSelection(input, openTag, closeTag) {
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selected = input.value.substring(start, end);
    const text = selected || 'teks';
    const replacement = openTag + text + closeTag;

    input.value = input.value.substring(0, start) + replacement + input.value.substring(end);
    input.focus();
    input.selectionStart = start + replacement.length;
    input.selectionEnd = start + replacement.length;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Auto-Uploader helper for landing page images
  function bindAutoUploader(fileInputId, textInputId, previewImgId) {
    const fileInput = document.getElementById(fileInputId);
    const textInput = document.getElementById(textInputId);
    const previewImg = document.getElementById(previewImgId);
    if (!fileInput || !textInput) return;

    fileInput.addEventListener('change', async () => {
      if (!fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('image', file);

      try {
        showToast('Mengupload gambar...');
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.file) {
          textInput.value = data.file.url;
          if (previewImg) previewImg.src = data.file.url;
          showToast('Gambar berhasil diupload');
        } else {
          showToast(data.message || 'Gagal mengupload gambar', 'danger');
        }
      } catch (err) {
        showToast('Upload gagal', 'danger');
      }
    });

    textInput.addEventListener('input', () => {
      if (previewImg) previewImg.src = textInput.value || previewImg.src;
    });
  }

  // Auto-uploaders for Hero backgrounds across all pages
  bindAutoUploader('lpk-upload-hero-image', 'lpk-input-hero-image', 'lpk-img-hero-preview');
  bindAutoUploader('bin-upload-hero-image', 'bin-input-hero-image', 'bin-img-hero-preview');
  bindAutoUploader('procool-upload-hero-image', 'procool-input-hero-image', 'procool-img-hero-preview');
  bindAutoUploader('legal-upload-hero-image', 'legal-input-hero-image', 'legal-img-hero-preview');
  bindAutoUploader('geoteknik-upload-hero-image', 'geoteknik-input-hero-image', 'geoteknik-img-hero-preview');

  // Auto-uploaders for About profile photos across all pages
  bindAutoUploader('lpk-upload-about-image', 'about-image', 'lpk-img-about-preview');
  bindAutoUploader('bin-upload-about-image', 'bin-input-about-image', 'bin-img-about-preview');
  bindAutoUploader('procool-upload-about-image', 'procool-input-about-image', 'procool-img-about-preview');
  bindAutoUploader('legal-upload-about-image', 'legal-input-about-image', 'legal-img-about-preview');
  bindAutoUploader('geoteknik-upload-about-image', 'geoteknik-input-about-image', 'geoteknik-img-about-preview');

  // --- Sub-Controller: BIN Holding Forms ---
  const formBinHero = document.getElementById('form-bin-hero');
  const formBinAbout = document.getElementById('form-bin-about');
  const formBinContact = document.getElementById('form-bin-contact');

  if (formBinHero) {
    formBinHero.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.bin) contentData.bin = {};
      const heroImg = document.getElementById('bin-input-hero-image');
      contentData.bin.hero = {
        badge: document.getElementById('bin-input-hero-badge').value,
        title: document.getElementById('bin-input-hero-title').value,
        subtitle: document.getElementById('bin-input-hero-subtitle').value,
        bg_image: heroImg ? heroImg.value : ''
      };
      updateContentData();
    });
  }

  if (formBinAbout) {
    formBinAbout.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.bin) contentData.bin = {};
      contentData.bin.about = {
        title: document.getElementById('bin-input-about-title').value,
        desc1: document.getElementById('bin-input-about-desc1').value,
        desc2: document.getElementById('bin-input-about-desc2').value,
        image: document.getElementById('bin-input-about-image').value
      };
      updateContentData();
    });
  }

  if (formBinContact) {
    formBinContact.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.bin) contentData.bin = {};
      contentData.bin.contact_info = {
        address: document.getElementById('bin-input-contact-address').value,
        phone: document.getElementById('bin-input-contact-phone').value,
        email: document.getElementById('bin-input-contact-email').value,
        hours: document.getElementById('bin-input-contact-hours').value
      };
      updateContentData();
    });
  }

  // --- Sub-Controller: Procool Forms ---
  const formProcoolHero = document.getElementById('form-procool-hero');
  const formProcoolAbout = document.getElementById('form-procool-about');
  const formProcoolContact = document.getElementById('form-procool-contact');

  if (formProcoolHero) {
    formProcoolHero.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.procool) contentData.procool = {};
      const heroImg = document.getElementById('procool-input-hero-image');
      contentData.procool.hero = {
        ...(contentData.procool.hero || {}),
        title: document.getElementById('procool-input-hero-title').value,
        subtitle: document.getElementById('procool-input-hero-subtitle').value,
        bg_image: heroImg ? heroImg.value : ''
      };
      updateContentData();
    });
  }

  if (formProcoolAbout) {
    formProcoolAbout.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.procool) contentData.procool = {};
      contentData.procool.about = {
        title: document.getElementById('procool-input-about-title').value,
        desc1: document.getElementById('procool-input-about-desc1').value,
        desc2: document.getElementById('procool-input-about-desc2').value,
        image: document.getElementById('procool-input-about-image').value
      };
      updateContentData();
    });
  }

  if (formProcoolContact) {
    formProcoolContact.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.procool) contentData.procool = {};
      contentData.procool.contact_info = {
        phone: document.getElementById('procool-input-contact-phone').value,
        email: document.getElementById('procool-input-contact-email').value,
        hours: document.getElementById('procool-input-contact-hours').value
      };
      updateContentData();
    });
  }

  // --- Sub-Controller: Legal Forms ---
  const formLegalHero = document.getElementById('form-legal-hero');
  const formLegalAbout = document.getElementById('form-legal-about');
  const formLegalContact = document.getElementById('form-legal-contact');

  if (formLegalHero) {
    formLegalHero.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.legal) contentData.legal = {};
      const heroImg = document.getElementById('legal-input-hero-image');
      contentData.legal.hero = {
        ...(contentData.legal.hero || {}),
        title: document.getElementById('legal-input-hero-title').value,
        subtitle: document.getElementById('legal-input-hero-subtitle').value,
        bg_image: heroImg ? heroImg.value : ''
      };
      updateContentData();
    });
  }

  if (formLegalAbout) {
    formLegalAbout.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.legal) contentData.legal = {};
      contentData.legal.about = {
        title: document.getElementById('legal-input-about-title').value,
        desc1: document.getElementById('legal-input-about-desc1').value,
        desc2: document.getElementById('legal-input-about-desc2').value,
        image: document.getElementById('legal-input-about-image').value
      };
      updateContentData();
    });
  }

  if (formLegalContact) {
    formLegalContact.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.legal) contentData.legal = {};
      contentData.legal.contact_info = {
        phone: document.getElementById('legal-input-contact-phone').value,
        email: document.getElementById('legal-input-contact-email').value,
        hours: document.getElementById('legal-input-contact-hours').value
      };
      updateContentData();
    });
  }

  // --- Sub-Controller: Geoteknik Forms ---
  const formGeoteknikHero = document.getElementById('form-geoteknik-hero');
  const formGeoteknikAbout = document.getElementById('form-geoteknik-about');
  const formGeoteknikContact = document.getElementById('form-geoteknik-contact');

  if (formGeoteknikHero) {
    formGeoteknikHero.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.geoteknik) contentData.geoteknik = {};
      const heroImg = document.getElementById('geoteknik-input-hero-image');
      contentData.geoteknik.hero = {
        ...(contentData.geoteknik.hero || {}),
        title: document.getElementById('geoteknik-input-hero-title').value,
        subtitle: document.getElementById('geoteknik-input-hero-subtitle').value,
        bg_image: heroImg ? heroImg.value : ''
      };
      updateContentData();
    });
  }

  if (formGeoteknikAbout) {
    formGeoteknikAbout.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.geoteknik) contentData.geoteknik = {};
      contentData.geoteknik.about = {
        title: document.getElementById('geoteknik-input-about-title').value,
        desc1: document.getElementById('geoteknik-input-about-desc1').value,
        desc2: document.getElementById('geoteknik-input-about-desc2').value,
        image: document.getElementById('geoteknik-input-about-image').value
      };
      updateContentData();
    });
  }

  if (formGeoteknikContact) {
    formGeoteknikContact.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      if (!contentData.geoteknik) contentData.geoteknik = {};
      contentData.geoteknik.contact_info = {
        phone: document.getElementById('geoteknik-input-contact-phone').value,
        email: document.getElementById('geoteknik-input-contact-email').value,
        hours: document.getElementById('geoteknik-input-contact-hours').value
      };
      updateContentData();
    });
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
    if (!token) return;
    try {
      const res = await fetch('/api/content/sections', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contentData)
      });
      if (res.ok) {
        showToast('Konten sections berhasil disimpan!');
      } else {
        showToast('Gagal menyimpan konten', 'danger');
      }
    } catch (err) {
      showToast('Error menyambung ke server', 'danger');
    }
  }

  if (formHero) {
    formHero.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      const heroBg = document.getElementById('lpk-input-hero-image');
      contentData.hero = {
        badge: document.getElementById('hero-badge').value,
        title: document.getElementById('hero-title').value,
        subtitle: document.getElementById('hero-subtitle').value,
        btnPrimary: document.getElementById('hero-btn-primary').value,
        btnOutline: document.getElementById('hero-btn-outline').value,
        bg_image: heroBg ? heroBg.value : (contentData.hero?.bg_image || '')
      };
      updateContentData();
    });
  }

  if (formAbout) {
    formAbout.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contentData) contentData = {};
      const imgInput = document.getElementById('about-image');
      contentData.about = {
        title: document.getElementById('about-title').value,
        experience: document.getElementById('about-experience').value,
        desc1: document.getElementById('about-desc1').value,
        desc2: document.getElementById('about-desc2').value,
        desc3: document.getElementById('about-desc3').value,
        image: imgInput ? imgInput.value : ''
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
      const res = await fetch('/api/content/testimonials');
      if (res.ok) {
        testimonialsList = await res.json();
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
    if (!token) return;
    try {
      const res = await fetch('/api/content/testimonials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testimonialsList)
      });
      if (res.ok && showFeedback) {
        showToast('Testimoni berhasil disimpan!');
        loadTestimonials();
      }
    } catch (err) {
      if (showFeedback) showToast('Gagal menyimpan testimoni', 'danger');
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
    try {
      const res = await fetch('/api/content/faq');
      if (res.ok) {
        faqList = await res.json();
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
    if (!token) return;
    try {
      const res = await fetch('/api/content/faq', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(faqList)
      });
      if (res.ok && showFeedback) {
        showToast('FAQ berhasil disimpan!');
        loadFaqs();
      }
    } catch (err) {
      if (showFeedback) showToast('Gagal menyimpan FAQ', 'danger');
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
    if (!token) return;
    try {
      const res = await fetch('/api/media', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        mediaList = await res.json();
        renderMediaGallery();
      }
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
            const res = await fetch(`/api/media/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              showToast('Media berhasil dihapus');
              loadMedia();
              loadStats();
            } else {
              showToast('Gagal menghapus media', 'danger');
            }
          } catch (err) {
            showToast('Error server', 'danger');
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
    if (!token) return;
    
    uploadProgressContainer.style.display = 'block';
    uploadProgressBar.style.width = '0%';
    uploadStatusText.textContent = `Mengupload ${file.name}...`;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/media/upload', true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Progress Tracker
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          uploadProgressBar.style.width = `${percent}%`;
        }
      };

      xhr.onload = () => {
        uploadProgressContainer.style.display = 'none';
        if (xhr.status === 201) {
          showToast('Gambar berhasil diupload!');
          loadMedia();
          loadStats();
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            showToast(data.message || 'Upload gagal', 'danger');
          } catch (err) {
            showToast('Upload gagal', 'danger');
          }
        }
      };

      xhr.onerror = () => {
        uploadProgressContainer.style.display = 'none';
        showToast('Koneksi ke server gagal', 'danger');
      };

      xhr.send(formData);

    } catch (err) {
      uploadProgressContainer.style.display = 'none';
      showToast('Error menyambung ke server', 'danger');
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
  const serviceFilterSelect = document.getElementById('submission-service-filter');

  if (serviceFilterSelect) {
    serviceFilterSelect.addEventListener('change', () => {
      loadSubmissions();
    });
  }

  function renderServiceBadge(serviceType, serviceName) {
    const type = (serviceType || 'lpk').toLowerCase();
    const name = serviceName || (type === 'lpk' ? 'LPK Buwas Ikigai Nusantara' : type === 'procool' ? 'Procool' : type === 'legal' ? 'Konsultasi Hukum' : 'Jasa Geoteknik');
    let badgeClass = 'badge-service-lpk';
    if (type === 'procool') badgeClass = 'badge-service-procool';
    else if (type === 'legal') badgeClass = 'badge-service-legal';
    else if (type === 'geoteknik') badgeClass = 'badge-service-geoteknik';

    return `<span class="badge-service ${badgeClass}">${name}</span>`;
  }

  function renderStatusBadge(status, isRead) {
    const st = status || (isRead ? 'read' : 'new');
    if (st === 'completed') {
      return `<span class="badge-status badge-status-completed">Selesai</span>`;
    } else if (st === 'in_progress') {
      return `<span class="badge-status badge-status-in_progress">Diproses</span>`;
    } else if (st === 'read') {
      return `<span class="badge-status badge-status-read">Dibaca</span>`;
    } else {
      return `<span class="badge-status badge-status-new">Baru</span>`;
    }
  }

  async function loadSubmissions() {
    if (!token) return;
    try {
      const filterVal = serviceFilterSelect ? serviceFilterSelect.value : 'all';
      const url = filterVal && filterVal !== 'all' ? `/api/contact?serviceType=${filterVal}` : '/api/contact';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        submissionsList = await res.json();
        renderSubmissionsTable();
        loadStats(); // keep badge and counters fresh
      }
    } catch (err) {
      console.error('Submissions load failed', err);
    }
  }

  function renderSubmissionsTable() {
    submissionsTableBody.innerHTML = '';
    
    if (submissionsList.length === 0) {
      submissionsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada pesan masuk / data pendaftar</td></tr>';
      return;
    }

    submissionsList.forEach(sub => {
      const row = document.createElement('tr');
      const dateVal = sub.submittedAt || sub.createdAt;
      const dateStr = new Date(dateVal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      const serviceBadge = renderServiceBadge(sub.serviceType, sub.serviceName);
      const statusBadge = renderStatusBadge(sub.status, sub.read);
      
      const contactStr = [sub.phone, sub.email].filter(Boolean).join(' • ');

      row.innerHTML = `
        <td style="font-size:0.8rem;color:#94a3b8;white-space:nowrap;">${dateStr}</td>
        <td>${serviceBadge}</td>
        <td>
          <div style="font-weight:600;color:#f8fafc;font-size:0.875rem;">${sub.name || '-'}</div>
          <div style="font-size:0.775rem;color:#94a3b8;margin-top:0.15rem;">${contactStr || '-'}</div>
        </td>
        <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.825rem;color:#cbd5e1;" title="${sub.program || ''}">${sub.program || '-'}</td>
        <td>${statusBadge}</td>
        <td style="text-align:center;white-space:nowrap;">
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
    
    const sourceList = allSubmissionsList.length ? allSubmissionsList : submissionsList;
    const recentList = sourceList.slice(0, 5);
    
    if (recentList.length === 0) {
      recentSubmissionsBody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada pesan masuk baru</td></tr>';
      return;
    }

    recentList.forEach(sub => {
      const row = document.createElement('tr');
      const dateVal = sub.submittedAt || sub.createdAt;
      const dateStr = new Date(dateVal).toLocaleDateString('id-ID');
      const badgeHtml = renderStatusBadge(sub.status, sub.read);

      row.innerHTML = `
        <td><strong>${sub.name}</strong></td>
        <td>${sub.program || '-'}</td>
        <td>${dateStr}</td>
        <td>${badgeHtml}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openSubmissionModal('${sub.id}')">Detail</button>
        </td>
      `;
      recentSubmissionsBody.appendChild(row);
    });
  }

  // Submission Detail Modal
  async function openSubmissionModal(id) {
    const sub = submissionsList.find(item => item.id === id) || allSubmissionsList.find(item => item.id === id);
    if (!sub) return;

    const dateVal = sub.submittedAt || sub.createdAt;
    document.getElementById('modal-date').textContent = new Date(dateVal).toLocaleString('id-ID');
    
    const modalServiceEl = document.getElementById('modal-service');
    if (modalServiceEl) {
      modalServiceEl.textContent = sub.serviceName || (sub.serviceType ? sub.serviceType.toUpperCase() : 'LPK Buwas Ikigai Nusantara');
    }

    const modalStatusSelect = document.getElementById('modal-status-select');
    if (modalStatusSelect) {
      modalStatusSelect.value = sub.status || (sub.read ? 'read' : 'new');
    }

    document.getElementById('modal-name').textContent = sub.name || '-';
    document.getElementById('modal-email').innerHTML = sub.email ? `<a href="mailto:${sub.email}" style="color:var(--primary);text-decoration:underline;">${sub.email}</a>` : '-';
    document.getElementById('modal-phone').innerHTML = sub.phone ? `<a href="tel:${sub.phone}" style="color:var(--primary);text-decoration:underline;">${sub.phone}</a>` : '-';
    document.getElementById('modal-program').textContent = sub.program || '-';
    document.getElementById('modal-message').textContent = sub.message || '-';

    const saveStatusBtn = document.getElementById('modal-save-status-btn');
    if (saveStatusBtn) {
      saveStatusBtn.onclick = async () => {
        const selectedStatus = modalStatusSelect ? modalStatusSelect.value : 'new';
        await updateSubmissionStatus(id, selectedStatus);
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
    
    // Automatically mark read silently if status is new
    if (!sub.read && (!sub.status || sub.status === 'new')) {
      await updateSubmissionStatus(id, 'read', false);
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

  async function updateSubmissionStatus(id, status, reload = true) {
    if (!token) return;

    // Optimistic UI update (Instant < 5ms)
    const updateTarget = (item) => {
      if (item && item.id === id) {
        item.status = status;
        if (status === 'read' || status === 'in_progress' || status === 'completed') {
          item.read = true;
        }
      }
    };
    submissionsList.forEach(updateTarget);
    allSubmissionsList.forEach(updateTarget);
    
    renderSubmissionsTable();
    renderRecentSubmissionsDashboard();
    if (reload) showToast('Status pendaftar berhasil diperbarui');

    try {
      await fetch(`/api/contact/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error('Update status error', err);
    }
  }

  async function deleteSubmission(id) {
    if (!token) return;

    // Optimistic UI delete (Instant < 5ms)
    submissionsList = submissionsList.filter(s => s.id !== id);
    allSubmissionsList = allSubmissionsList.filter(s => s.id !== id);
    renderSubmissionsTable();
    renderRecentSubmissionsDashboard();
    showToast('Pesan berhasil dihapus');

    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        loadSubmissions(); // reload on error
      }
    } catch (err) {
      showToast('Error server', 'danger');
      loadSubmissions();
    }
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (!token) return;
      // Download directly by creating a form or hitting endpoint with token in header.
      // Since window.open doesn't support headers, we must download using fetch and anchor tag.
      fetch('/api/contact/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'pesan_masuk_heti.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('File CSV berhasil diekspor!');
      })
      .catch(err => {
        showToast('Gagal mengekspor CSV', 'danger');
      });
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
      const res = await fetch('/api/auth/settings');
      if (res.ok) {
        const data = await res.json();
        document.getElementById('settings-title').value = data.siteTitle || '';
        document.getElementById('settings-description').value = data.metaDescription || '';
        document.getElementById('settings-username').value = localStorage.getItem('heti_admin_username') || 'admin';
      }
    } catch (err) {
      console.error('Settings load failed', err);
    }
  }

  if (formSiteSettings) {
    formSiteSettings.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!token) return;

      const siteTitle = document.getElementById('settings-title').value;
      const metaDescription = document.getElementById('settings-description').value;
      const username = document.getElementById('settings-username').value;

      try {
        const res = await fetch('/api/auth/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ siteTitle, metaDescription, username })
        });
        
        const data = await res.json();

        if (res.ok) {
          showToast(data.message || 'Pengaturan diperbarui!');
          localStorage.setItem('heti_admin_username', data.settings.username);
          userDisplay.textContent = data.settings.username;
        } else {
          showToast(data.message || 'Gagal menyimpan pengaturan', 'danger');
        }
      } catch (err) {
        showToast('Error server', 'danger');
      }
    });
  }

  if (formChangePassword) {
    formChangePassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!token) return;

      const oldPassword = document.getElementById('password-old').value;
      const newPassword = document.getElementById('password-new').value;
      const confirmPassword = document.getElementById('password-confirm').value;

      if (newPassword !== confirmPassword) {
        showToast('Password baru dan konfirmasi tidak sesuai!', 'danger');
        return;
      }

      try {
        const res = await fetch('/api/auth/password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await res.json();

        if (res.ok) {
          showToast('Password berhasil diubah!');
          formChangePassword.reset();
        } else {
          showToast(data.message || 'Gagal mengubah password', 'danger');
        }
      } catch (err) {
        showToast('Error server', 'danger');
      }
    });
  }

  // ============================================
  // MEDIA SELECTOR MODAL HELPER
  // ============================================
  const mediaSelectorModal = document.getElementById('media-selector-modal');
  const mediaSelectorCloseBtn = document.getElementById('media-selector-close-btn');
  const mediaSelectorCancelBtn = document.getElementById('media-selector-cancel-btn');
  const mediaSelectorSearch = document.getElementById('media-selector-search');
  const mediaSelectorGrid = document.getElementById('media-selector-grid');
  const mediaSelectorUploadBtn = document.getElementById('media-selector-upload-btn');
  const mediaSelectorFileInput = document.getElementById('media-selector-file-input');
  const mediaSelectorRefreshBtn = document.getElementById('media-selector-refresh-btn');
  const mediaSelectorSelectedUrl = document.getElementById('media-selector-selected-url');

  let mediaSelectorCallback = null;
  let selectorMediaList = [];

  async function openMediaSelector(onSelectCallback) {
    mediaSelectorCallback = onSelectCallback;
    if (mediaSelectorModal) mediaSelectorModal.style.display = 'flex';
    if (mediaSelectorSelectedUrl) mediaSelectorSelectedUrl.textContent = 'Belum ada file yang dipilih';
    await fetchSelectorMedia();
  }

  function closeMediaSelector() {
    if (mediaSelectorModal) mediaSelectorModal.style.display = 'none';
    mediaSelectorCallback = null;
  }

  if (mediaSelectorCloseBtn) mediaSelectorCloseBtn.addEventListener('click', closeMediaSelector);
  if (mediaSelectorCancelBtn) mediaSelectorCancelBtn.addEventListener('click', closeMediaSelector);

  async function fetchSelectorMedia() {
    if (!token) return;
    try {
      const res = await fetch('/api/media', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        selectorMediaList = await res.json();
        renderSelectorMediaGrid();
      }
    } catch (err) {
      console.error('Selector media load error:', err);
    }
  }

  function renderSelectorMediaGrid(filterQuery = '') {
    if (!mediaSelectorGrid) return;
    mediaSelectorGrid.innerHTML = '';

    const query = filterQuery.toLowerCase().trim();
    const filtered = selectorMediaList.filter(m => m.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
      mediaSelectorGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); padding: 2rem;">Tidak ada media ditemukan</div>';
      return;
    }

    filtered.forEach(media => {
      const card = document.createElement('div');
      card.className = 'media-selector-card';
      card.style.cssText = 'border:1px solid var(--border-dark); border-radius:8px; overflow:hidden; cursor:pointer; background:var(--bg-dark); transition:transform 0.15s, border-color 0.15s; position:relative;';
      card.innerHTML = `
        <img src="${media.url}" alt="${media.name}" style="width:100%; height:85px; object-fit:cover; display:block;">
        <div style="padding:4px 6px; font-size:0.7rem; color:var(--text-light); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${media.name}">${media.name}</div>
      `;

      card.addEventListener('mouseenter', () => { card.style.borderColor = 'var(--primary)'; card.style.transform = 'scale(1.03)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--border-dark)'; card.style.transform = 'scale(1)'; });

      card.addEventListener('click', () => {
        if (mediaSelectorSelectedUrl) mediaSelectorSelectedUrl.textContent = 'Dipilih: ' + media.url;
        if (typeof mediaSelectorCallback === 'function') {
          mediaSelectorCallback(media.url);
        }
        showToast('Gambar berhasil dipilih!');
        closeMediaSelector();
      });

      mediaSelectorGrid.appendChild(card);
    });
  }

  if (mediaSelectorSearch) {
    mediaSelectorSearch.addEventListener('input', (e) => {
      renderSelectorMediaGrid(e.target.value);
    });
  }

  if (mediaSelectorRefreshBtn) {
    mediaSelectorRefreshBtn.addEventListener('click', fetchSelectorMedia);
  }

  if (mediaSelectorUploadBtn && mediaSelectorFileInput) {
    mediaSelectorUploadBtn.addEventListener('click', () => mediaSelectorFileInput.click());
    mediaSelectorFileInput.addEventListener('change', async () => {
      if (mediaSelectorFileInput.files.length > 0) {
        const file = mediaSelectorFileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);

        try {
          const res = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            showToast('Gambar baru berhasil diupload!');
            await fetchSelectorMedia();
            if (typeof mediaSelectorCallback === 'function') {
              mediaSelectorCallback(data.file.url);
            }
            closeMediaSelector();
          } else {
            showToast(data.message || 'Upload gagal', 'danger');
          }
        } catch (err) {
          showToast('Upload gagal', 'danger');
        }
      }
    });
  }

  // Export to window
  window.openMediaSelector = openMediaSelector;

  // Global delegation for buttons with .open-media-selector-btn
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.open-media-selector-btn');
    if (btn) {
      const targetInputId = btn.getAttribute('data-target-input');
      const targetPreviewId = btn.getAttribute('data-target-preview');

      openMediaSelector((url) => {
        if (targetInputId) {
          const input = document.getElementById(targetInputId);
          if (input) {
            input.value = url;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        if (targetPreviewId) {
          const preview = document.getElementById(targetPreviewId);
          if (preview) preview.src = url;
        }
      });
    }
  });

  // ============================================
  // SUB-CONTROLLER: GALLERY & PORTOFOLIO MANAGER
  // ============================================
  let galleryList = [];
  const galleryContainer = document.getElementById('gallery-list-container');
  const addGalleryBtn = document.getElementById('add-gallery-btn');

  async function loadGallery() {
    try {
      const res = await fetch('/api/content/gallery');
      if (res.ok) {
        galleryList = await res.json();
        renderGalleryEditor();
      }
    } catch (err) {
      console.error('Gallery loading failed', err);
    }
  }

  function renderGalleryEditor() {
    if (!galleryContainer) return;
    galleryContainer.innerHTML = '';

    if (galleryList.length === 0) {
      galleryContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); padding: 2rem;">Belum ada foto galeri. Klik "Tambah Foto Galeri Baru".</div>';
      return;
    }

    galleryList.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'editable-card';
      const inputId = `gal-img-${index}`;
      const previewId = `gal-prev-${index}`;

      card.innerHTML = `
        <div class="card-actions-top">
          <button type="button" class="btn btn-outline-danger delete-gallery-btn" data-index="${index}" style="padding: 0.5rem;" title="Hapus Foto"><i data-lucide="trash-2"></i></button>
        </div>
        <div style="display:flex; gap:1rem; align-items:flex-start; flex-wrap:wrap; margin-bottom:0.75rem;">
          <img id="${previewId}" src="${item.src || 'assets/images/gallery-excavator.png'}" style="width:100px; height:70px; object-fit:cover; border-radius:6px; border:1px solid var(--border-dark);">
          <div style="flex:1; min-width:160px;">
            <label style="font-size:0.75rem;">URL Foto / Gambar</label>
            <input type="text" class="form-control gal-src" id="${inputId}" value="${item.src || ''}" required>
            <button type="button" class="btn btn-outline-info btn-sm open-media-selector-btn" data-target-input="${inputId}" data-target-preview="${previewId}" style="margin-top:0.35rem; width:100%;">
              <i data-lucide="image"></i> Pilih dari Media
            </button>
          </div>
        </div>
        <div class="form-group">
          <label>Judul Kegiatan / Portofolio</label>
          <input type="text" class="form-control gal-title" value="${item.title || ''}" required>
        </div>
        <div class="form-group">
          <label>Deskripsi Singkat</label>
          <input type="text" class="form-control gal-desc" value="${item.desc || ''}">
        </div>
        <div class="form-group">
          <label>Alt Text / Tag (opsional)</label>
          <input type="text" class="form-control gal-alt" value="${item.alt || ''}">
        </div>
      `;
      galleryContainer.appendChild(card);
    });

    initIcons();

    // Bind deletes
    galleryContainer.querySelectorAll('.delete-gallery-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        if (confirm('Hapus foto ini dari galeri?')) {
          galleryList.splice(index, 1);
          saveGallery();
        }
      });
    });

    // Bind input updates
    galleryContainer.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('change', () => {
        collectGalleryInputs();
        saveGallery(false);
      });
    });
  }

  function collectGalleryInputs() {
    galleryList = [];
    if (!galleryContainer) return;
    const cards = galleryContainer.querySelectorAll('.editable-card');
    cards.forEach(card => {
      galleryList.push({
        title: card.querySelector('.gal-title').value,
        src: card.querySelector('.gal-src').value,
        desc: card.querySelector('.gal-desc').value,
        alt: card.querySelector('.gal-alt').value
      });
    });
  }

  async function saveGallery(showFeedback = true) {
    if (!token) return;
    collectGalleryInputs();
    try {
      const res = await fetch('/api/content/gallery', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(galleryList)
      });
      if (res.ok && showFeedback) {
        showToast('Galeri berhasil disimpan!');
        loadGallery();
      }
    } catch (err) {
      if (showFeedback) showToast('Gagal menyimpan galeri', 'danger');
    }
  }

  if (addGalleryBtn) {
    addGalleryBtn.addEventListener('click', () => {
      galleryList.push({
        title: 'Foto Kegiatan Baru',
        src: 'assets/images/gallery-excavator.png',
        desc: 'Deskripsi kegiatan...',
        alt: 'Galeri'
      });
      renderGalleryEditor();
      saveGallery(false);
    });
  }

  // ============================================
  // SUB-CONTROLLER: PER-PAGE GALLERY MANAGERS
  // (LPK, Procool, Legal, Geoteknik)
  // ============================================
  const pageGalleryData = { lpk: [], procool: [], legal: [], geoteknik: [] };
  const PAGE_NAMES = { lpk: 'LPK', procool: 'Procool', legal: 'Konsultasi Hukum', geoteknik: 'Jasa Geoteknik' };

  async function loadPageGallery(page) {
    try {
      const res = await fetch(`/api/content/gallery/${page}`);
      if (res.ok) {
        pageGalleryData[page] = await res.json();
        renderPageGalleryEditor(page);
      }
    } catch (err) {
      console.error(`Gallery ${page} loading failed`, err);
    }
  }

  function renderPageGalleryEditor(page) {
    const container = document.getElementById(`gallery-${page}-container`);
    if (!container) return;
    const items = pageGalleryData[page] || [];
    container.innerHTML = '';

    if (items.length === 0) {
      container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); padding: 2rem;">Belum ada foto galeri. Klik "Tambah Foto" untuk mulai.</div>';
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'editable-card';
      const inputId = `pgal-${page}-img-${index}`;
      const previewId = `pgal-${page}-prev-${index}`;

      card.innerHTML = `
        <div class="card-actions-top">
          <button type="button" class="btn btn-outline-danger delete-page-gallery-btn" data-page="${page}" data-index="${index}" style="padding: 0.5rem;" title="Hapus Foto"><i data-lucide="trash-2"></i></button>
        </div>
        <div style="display:flex; gap:1rem; align-items:flex-start; flex-wrap:wrap; margin-bottom:0.75rem;">
          <img id="${previewId}" src="${item.src || 'assets/images/gallery-excavator.png'}" style="width:100px; height:70px; object-fit:cover; border-radius:6px; border:1px solid var(--border-dark);">
          <div style="flex:1; min-width:160px;">
            <label style="font-size:0.75rem;">URL Foto / Gambar</label>
            <input type="text" class="form-control pgal-src" id="${inputId}" value="${item.src || ''}" required>
            <button type="button" class="btn btn-outline-info btn-sm open-media-selector-btn" data-target-input="${inputId}" data-target-preview="${previewId}" style="margin-top:0.35rem; width:100%;">
              <i data-lucide="image"></i> Pilih dari Media
            </button>
          </div>
        </div>
        <div class="form-group">
          <label>Judul Foto</label>
          <input type="text" class="form-control pgal-title" value="${item.title || ''}" required>
        </div>
        <div class="form-group">
          <label>Deskripsi Singkat</label>
          <input type="text" class="form-control pgal-desc" value="${item.desc || ''}">
        </div>
        <div class="form-group">
          <label>Alt Text (opsional)</label>
          <input type="text" class="form-control pgal-alt" value="${item.alt || ''}">
        </div>
      `;
      container.appendChild(card);
    });

    initIcons();

    // Bind delete buttons
    container.querySelectorAll('.delete-page-gallery-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pg = btn.getAttribute('data-page');
        const idx = parseInt(btn.getAttribute('data-index'));
        if (confirm('Hapus foto ini dari galeri?')) {
          pageGalleryData[pg].splice(idx, 1);
          savePageGallery(pg, true);
        }
      });
    });

    // Bind preview updates on input/change
    container.querySelectorAll('.pgal-src').forEach(input => {
      const updatePreview = () => {
        const prevId = input.getAttribute('id')?.replace('img', 'prev');
        if (prevId) {
          const prev = document.getElementById(prevId);
          if (prev) prev.src = input.value || 'assets/images/gallery-excavator.png';
        }
      };
      input.addEventListener('input', updatePreview);
      input.addEventListener('change', updatePreview);
    });
  }

  function collectPageGalleryInputs(page) {
    const container = document.getElementById(`gallery-${page}-container`);
    if (!container) return;
    const items = [];
    container.querySelectorAll('.editable-card').forEach(card => {
      items.push({
        title: card.querySelector('.pgal-title')?.value || '',
        src: card.querySelector('.pgal-src')?.value || '',
        desc: card.querySelector('.pgal-desc')?.value || '',
        alt: card.querySelector('.pgal-alt')?.value || ''
      });
    });
    pageGalleryData[page] = items;
  }

  async function savePageGallery(page, reRender = true) {
    if (!token) return;
    collectPageGalleryInputs(page);
    try {
      const res = await fetch(`/api/content/gallery/${page}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pageGalleryData[page])
      });
      if (res.ok) {
        showToast(`Galeri ${PAGE_NAMES[page] || page} berhasil disimpan!`);
        if (reRender) renderPageGalleryEditor(page);
      }
    } catch (err) {
      showToast(`Gagal menyimpan galeri ${PAGE_NAMES[page] || page}`, 'danger');
    }
  }

  // Bind "Tambah Foto" buttons for all pages
  document.querySelectorAll('.add-page-gallery-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      if (!pageGalleryData[page]) pageGalleryData[page] = [];
      pageGalleryData[page].push({
        title: 'Foto Baru',
        src: 'assets/images/gallery-excavator.png',
        desc: 'Deskripsi...',
        alt: 'Galeri'
      });
      renderPageGalleryEditor(page);
    });
  });

  // Bind "Simpan" buttons for all pages
  document.querySelectorAll('.save-page-gallery-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      savePageGallery(page, true);
    });
  });

  // Load all page galleries on init
  function loadAllPageGalleries() {
    ['lpk', 'procool', 'legal', 'geoteknik'].forEach(page => loadPageGallery(page));
  }

  // ============================================
  // SUB-CONTROLLER: MITRA & PARTNER MANAGER
  // ============================================
  let partnersList = [];
  const partnersContainer = document.getElementById('partners-list-container');
  const addPartnerBtn = document.getElementById('add-partner-btn');

  async function loadPartners() {
    try {
      const res = await fetch('/api/content/partners');
      if (res.ok) {
        partnersList = await res.json();
        renderPartnersEditor();
      }
    } catch (err) {
      console.error('Partners loading failed', err);
    }
  }

  function renderPartnersEditor() {
    if (!partnersContainer) return;
    partnersContainer.innerHTML = '';

    if (partnersList.length === 0) {
      partnersContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); padding: 2rem;">Belum ada partner. Klik "Tambah Partner Baru".</div>';
      return;
    }

    partnersList.forEach((partner, index) => {
      const card = document.createElement('div');
      card.className = 'editable-card';
      const inputId = `partner-logo-${index}`;

      card.innerHTML = `
        <div class="card-actions-top">
          <button type="button" class="btn btn-outline-danger delete-partner-btn" data-index="${index}" style="padding: 0.5rem;" title="Hapus Partner"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="form-group" style="padding-right:2.5rem;">
          <label>Nama Perusahaan / Partner</label>
          <input type="text" class="form-control partner-name" value="${partner.name || ''}" required>
        </div>
        <div class="form-group">
          <label>Logo (opsional)</label>
          <input type="text" class="form-control partner-logo" id="${inputId}" value="${partner.logo || partner.src || ''}" placeholder="URL Logo (opsional)">
          <button type="button" class="btn btn-outline-info btn-sm open-media-selector-btn" data-target-input="${inputId}" style="margin-top:0.35rem; width:100%;">
            <i data-lucide="image"></i> Pilih Logo
          </button>
        </div>
      `;
      partnersContainer.appendChild(card);
    });

    initIcons();

    // Bind deletes
    partnersContainer.querySelectorAll('.delete-partner-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        if (confirm('Hapus partner ini?')) {
          partnersList.splice(index, 1);
          savePartners();
        }
      });
    });

    // Bind input updates
    partnersContainer.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('change', () => {
        collectPartnersInputs();
        savePartners(false);
      });
    });
  }

  function collectPartnersInputs() {
    partnersList = [];
    if (!partnersContainer) return;
    const cards = partnersContainer.querySelectorAll('.editable-card');
    cards.forEach(card => {
      const logo = card.querySelector('.partner-logo').value;
      const partnerObj = { name: card.querySelector('.partner-name').value };
      if (logo) partnerObj.logo = logo;
      partnersList.push(partnerObj);
    });
  }

  async function savePartners(showFeedback = true) {
    if (!token) return;
    collectPartnersInputs();
    try {
      const res = await fetch('/api/content/partners', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(partnersList)
      });
      if (res.ok && showFeedback) {
        showToast('Mitra berhasil disimpan!');
        loadPartners();
      }
    } catch (err) {
      if (showFeedback) showToast('Gagal menyimpan partner', 'danger');
    }
  }

  if (addPartnerBtn) {
    addPartnerBtn.addEventListener('click', () => {
      partnersList.push({ name: 'NAMA PERUSAHAAN MITRA' });
      renderPartnersEditor();
      savePartners(false);
    });
  }

  // Start check session on page load
  checkSession();
});
