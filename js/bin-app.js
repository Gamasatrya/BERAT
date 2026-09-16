/**
 * Buwas Ikigai Nusantara (BIN) — Main & Unit Services Application JS
 * Handles navigation, mobile menu, Lucide icons, smooth scroll,
 * dynamic API content rendering, and contact form submissions across all unit pages.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  const initIcons = () => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  };
  initIcons();

  // Scroll Reveal Animations
  const initScrollReveal = () => {
    const revealElements = document.querySelectorAll(
      '.reveal, .reveal-up, .reveal-down, .reveal-left, .reveal-right, .reveal-scale'
    );

    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('active');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px 50px 0px' }
      );

      revealElements.forEach(el => revealObserver.observe(el));
    } else {
      // Fallback for older browsers
      revealElements.forEach(el => el.classList.add('active'));
    }
  };
  initScrollReveal();

  // Mobile Menu Toggle
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileOverlay = document.getElementById('mobile-overlay');

  if (hamburger && mobileMenu && mobileOverlay) {
    const toggleMenu = () => {
      const expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !expanded);
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      mobileOverlay.classList.toggle('active');
      document.body.style.overflow = !expanded ? 'hidden' : '';
    };

    hamburger.addEventListener('click', toggleMenu);
    mobileOverlay.addEventListener('click', toggleMenu);

    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (mobileMenu.classList.contains('active')) {
          toggleMenu();
        }
      });
    });
  }

  // Sticky Navbar Scroll Effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // Dynamic Content Loading from /api/content
  async function loadDynamicContent() {
    try {
      const response = await fetch('/api/content');
      if (!response.ok) return;
      const data = await response.json();
      const content = data.content || {};

      // If on BIN Main Page
      if (document.getElementById('bin-hero-title') && content.bin) {
        renderBINPage(content.bin);
      }
      // If on Procool Page
      if (document.getElementById('procool-hero-title') && content.procool) {
        renderProcoolPage(content.procool);
      }
      // If on Legal Page
      if (document.getElementById('legal-hero-title') && content.legal) {
        renderLegalPage(content.legal);
      }
      // If on Geoteknik Page
      if (document.getElementById('geoteknik-hero-title') && content.geoteknik) {
        renderGeoteknikPage(content.geoteknik);
      }

      initIcons();
      initScrollReveal();
    } catch (err) {
      console.log('[BIN App] Dynamic content fallback:', err.message);
    }

    // Load per-page gallery based on which page we're on
    const pageGalleryMap = {
      'procool-hero-title': 'procool',
      'legal-hero-title':   'legal',
      'geoteknik-hero-title': 'geoteknik',
    };

    let galleryPage = null;
    for (const [elId, pageName] of Object.entries(pageGalleryMap)) {
      if (document.getElementById(elId)) {
        galleryPage = pageName;
        break;
      }
    }

    if (galleryPage) {
      try {
        const galRes = await fetch(`/api/content/gallery/${galleryPage}`);
        if (galRes.ok) {
          const galData = await galRes.json();
          if (Array.isArray(galData) && galData.length > 0) {
            renderGallery(galData);
            initIcons();
            reinitGallery();
          }
        }
      } catch (err) {
        console.log(`[BIN App] Gallery fallback for ${galleryPage}:`, err.message);
      }
    } else if (document.getElementById('bin-hero-title')) {
      // Main BIN landing page — render shared/main gallery
      try {
        const galRes = await fetch('/api/content/gallery');
        if (galRes.ok) {
          const galData = await galRes.json();
          if (Array.isArray(galData) && galData.length > 0) {
            renderGallery(galData);
            initIcons();
            reinitGallery();
          }
        }
      } catch (err) {
        console.log('[BIN App] Main gallery fallback:', err.message);
      }
    }
  }

  function renderBINPage(bin) {
    if (bin.hero) {
      const badgeEl = document.getElementById('bin-hero-badge');
      const titleEl = document.getElementById('bin-hero-title');
      const subEl = document.getElementById('bin-hero-subtitle');
      if (badgeEl && bin.hero.badge) badgeEl.querySelector('span').textContent = bin.hero.badge;
      if (titleEl && bin.hero.title) titleEl.innerHTML = bin.hero.title;
      if (subEl && bin.hero.subtitle) subEl.textContent = bin.hero.subtitle;
      if (bin.hero.bg_image) {
        const heroSection = document.getElementById('hero');
        if (heroSection) {
          heroSection.style.background = `linear-gradient(rgba(10, 17, 40, 0.85), rgba(10, 17, 40, 0.95)), url('${bin.hero.bg_image}') center/cover no-repeat`;
        }
      }
    }
    if (bin.about) {
      const titleEl = document.getElementById('bin-about-title');
      const desc1El = document.getElementById('bin-about-desc1');
      const desc2El = document.getElementById('bin-about-desc2');
      const imgEl = document.getElementById('bin-about-img');
      if (titleEl && bin.about.title) titleEl.textContent = bin.about.title;
      if (desc1El && bin.about.desc1) desc1El.textContent = bin.about.desc1;
      if (desc2El && bin.about.desc2) desc2El.textContent = bin.about.desc2;
      if (imgEl && bin.about.image) imgEl.src = bin.about.image;
    }
    if (bin.contact_info) {
      const addrEl = document.getElementById('bin-contact-address');
      const phoneEl = document.getElementById('bin-contact-phone');
      const emailEl = document.getElementById('bin-contact-email');
      const hoursEl = document.getElementById('bin-contact-hours');
      if (addrEl && bin.contact_info.address) addrEl.textContent = bin.contact_info.address;
      if (phoneEl && bin.contact_info.phone) phoneEl.textContent = bin.contact_info.phone;
      if (emailEl && bin.contact_info.email) emailEl.textContent = bin.contact_info.email;
      if (hoursEl && bin.contact_info.hours) hoursEl.textContent = bin.contact_info.hours;
    }
  }

  function renderProcoolPage(procool) {
    if (procool.hero) {
      const titleEl = document.getElementById('procool-hero-title');
      const subEl = document.getElementById('procool-hero-subtitle');
      if (titleEl && procool.hero.title) titleEl.innerHTML = procool.hero.title;
      if (subEl && procool.hero.subtitle) subEl.textContent = procool.hero.subtitle;
      if (procool.hero.bg_image) {
        const heroSection = document.getElementById('hero');
        if (heroSection) {
          heroSection.style.background = `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url('${procool.hero.bg_image}') center/cover no-repeat`;
        }
      }
    }
    if (procool.about) {
      const titleEl = document.getElementById('procool-about-title');
      const desc1El = document.getElementById('procool-about-desc1');
      const desc2El = document.getElementById('procool-about-desc2');
      const imgEl = document.getElementById('procool-about-img');
      if (titleEl && procool.about.title) titleEl.textContent = procool.about.title;
      if (desc1El && procool.about.desc1) desc1El.textContent = procool.about.desc1;
      if (desc2El && procool.about.desc2) desc2El.textContent = procool.about.desc2;
      if (imgEl && procool.about.image) imgEl.src = procool.about.image;
    }
    if (procool.contact_info) {
      const phoneEl = document.getElementById('procool-contact-phone');
      const emailEl = document.getElementById('procool-contact-email');
      const hoursEl = document.getElementById('procool-contact-hours');
      if (phoneEl && procool.contact_info.phone) phoneEl.textContent = procool.contact_info.phone;
      if (emailEl && procool.contact_info.email) emailEl.textContent = procool.contact_info.email;
      if (hoursEl && procool.contact_info.hours) hoursEl.textContent = procool.contact_info.hours;
    }
  }

  function renderLegalPage(legal) {
    if (legal.hero) {
      const titleEl = document.getElementById('legal-hero-title');
      const subEl = document.getElementById('legal-hero-subtitle');
      if (titleEl && legal.hero.title) titleEl.innerHTML = legal.hero.title;
      if (subEl && legal.hero.subtitle) subEl.textContent = legal.hero.subtitle;
      if (legal.hero.bg_image) {
        const heroSection = document.getElementById('hero');
        if (heroSection) {
          heroSection.style.background = `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url('${legal.hero.bg_image}') center/cover no-repeat`;
        }
      }
    }
    if (legal.about) {
      const titleEl = document.getElementById('legal-about-title');
      const desc1El = document.getElementById('legal-about-desc1');
      const desc2El = document.getElementById('legal-about-desc2');
      const imgEl = document.getElementById('legal-about-img');
      if (titleEl && legal.about.title) titleEl.textContent = legal.about.title;
      if (desc1El && legal.about.desc1) desc1El.textContent = legal.about.desc1;
      if (desc2El && legal.about.desc2) desc2El.textContent = legal.about.desc2;
      if (imgEl && legal.about.image) imgEl.src = legal.about.image;
    }
    if (legal.contact_info) {
      const phoneEl = document.getElementById('legal-contact-phone');
      const emailEl = document.getElementById('legal-contact-email');
      const hoursEl = document.getElementById('legal-contact-hours');
      if (phoneEl && legal.contact_info.phone) phoneEl.textContent = legal.contact_info.phone;
      if (emailEl && legal.contact_info.email) emailEl.textContent = legal.contact_info.email;
      if (hoursEl && legal.contact_info.hours) hoursEl.textContent = legal.contact_info.hours;
    }
  }

  function renderGeoteknikPage(geoteknik) {
    if (geoteknik.hero) {
      const titleEl = document.getElementById('geoteknik-hero-title');
      const subEl = document.getElementById('geoteknik-hero-subtitle');
      if (titleEl && geoteknik.hero.title) titleEl.innerHTML = geoteknik.hero.title;
      if (subEl && geoteknik.hero.subtitle) subEl.textContent = geoteknik.hero.subtitle;
      if (geoteknik.hero.bg_image) {
        const heroSection = document.getElementById('hero');
        if (heroSection) {
          heroSection.style.background = `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url('${geoteknik.hero.bg_image}') center/cover no-repeat`;
        }
      }
    }
    if (geoteknik.about) {
      const titleEl = document.getElementById('geoteknik-about-title');
      const desc1El = document.getElementById('geoteknik-about-desc1');
      const desc2El = document.getElementById('geoteknik-about-desc2');
      const imgEl = document.getElementById('geoteknik-about-img');
      if (titleEl && geoteknik.about.title) titleEl.textContent = geoteknik.about.title;
      if (desc1El && geoteknik.about.desc1) desc1El.textContent = geoteknik.about.desc1;
      if (desc2El && geoteknik.about.desc2) desc2El.textContent = geoteknik.about.desc2;
      if (imgEl && geoteknik.about.image) imgEl.src = geoteknik.about.image;
    }
    if (geoteknik.contact_info) {
      const phoneEl = document.getElementById('geoteknik-contact-phone');
      const emailEl = document.getElementById('geoteknik-contact-email');
      const hoursEl = document.getElementById('geoteknik-contact-hours');
      if (phoneEl && geoteknik.contact_info.phone) phoneEl.textContent = geoteknik.contact_info.phone;
      if (emailEl && geoteknik.contact_info.email) emailEl.textContent = geoteknik.contact_info.email;
      if (hoursEl && geoteknik.contact_info.hours) hoursEl.textContent = geoteknik.contact_info.hours;
    }
  }

  loadDynamicContent();

  // Contact Form Submission Handler across all pages
  const setupFormSubmission = (formId, serviceType, serviceName) => {
    const form = document.getElementById(formId);
    if (!form) return;

    // Real-time visual feedback on required fields
    const formFields = form.querySelectorAll('input, select, textarea');
    formFields.forEach(field => {
      field.addEventListener('blur', () => {
        if (field.hasAttribute('required')) {
          if (!field.value.trim()) {
            field.style.borderColor = '#ef4444';
          } else {
            field.style.borderColor = '';
          }
        }
      });
      field.addEventListener('input', () => {
        if (field.value.trim()) {
          field.style.borderColor = '';
        }
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = form.querySelector('input[type="text"], input[name="name"]');
      const emailInput = form.querySelector('input[type="email"], input[name="email"]');
      const phoneInput = form.querySelector('input[type="tel"], input[name="phone"]');
      const serviceSelect = form.querySelector('select');
      const messageTextarea = form.querySelector('textarea');
      const btn = form.querySelector('button[type="submit"]');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const program = serviceSelect ? serviceSelect.value.trim() : serviceName;
      const message = messageTextarea ? messageTextarea.value.trim() : '';

      // ─── VALIDASI SELURUH FIELD MANDATORY ───
      if (!name) {
        alert('Kolom Nama Lengkap wajib diisi.');
        if (nameInput) { nameInput.style.borderColor = '#ef4444'; nameInput.focus(); }
        return;
      }
      if (name.length < 2) {
        alert('Nama lengkap minimal 2 karakter.');
        if (nameInput) { nameInput.style.borderColor = '#ef4444'; nameInput.focus(); }
        return;
      }

      if (emailInput && !email) {
        alert('Kolom Email wajib diisi.');
        emailInput.style.borderColor = '#ef4444';
        emailInput.focus();
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Format alamat email tidak valid.');
        if (emailInput) { emailInput.style.borderColor = '#ef4444'; emailInput.focus(); }
        return;
      }

      if (!phone) {
        alert('Kolom Nomor Telepon / WhatsApp wajib diisi.');
        if (phoneInput) { phoneInput.style.borderColor = '#ef4444'; phoneInput.focus(); }
        return;
      }
      if (!/^[\d\s\-\+\(\)]{8,}$/.test(phone)) {
        alert('Format nomor telepon tidak valid (minimal 8 digit).');
        if (phoneInput) { phoneInput.style.borderColor = '#ef4444'; phoneInput.focus(); }
        return;
      }

      if (serviceSelect && (!program || program === '')) {
        alert('Silakan pilih salah satu opsi layanan / program.');
        serviceSelect.style.borderColor = '#ef4444';
        serviceSelect.focus();
        return;
      }

      if (!message) {
        alert('Kolom Pesan / Detail kebutuhan wajib diisi.');
        if (messageTextarea) { messageTextarea.style.borderColor = '#ef4444'; messageTextarea.focus(); }
        return;
      }
      if (message.length < 3) {
        alert('Pesan atau detail kebutuhan minimal 3 karakter.');
        if (messageTextarea) { messageTextarea.style.borderColor = '#ef4444'; messageTextarea.focus(); }
        return;
      }

      const submitData = {
        name,
        email,
        phone,
        program,
        message,
        serviceType,
        serviceName,
        status: 'new',
        read: false,
        submittedAt: new Date().toISOString()
      };

      const origBtnText = btn ? btn.innerHTML : '';

      try {
        if (btn) {
          btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Mengirim...`;
          btn.disabled = true;
          initIcons();
        }

        let isSuccess = false;

        // ─── LAYER 1: Kirim ke /api/contact (Express lokal atau Netlify Function) ───
        try {
          const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submitData)
          });

          if (response.ok) {
            isSuccess = true;
          }
        } catch (apiErr) {
          console.warn('[BIN Contact] /api/contact gagal, mencoba layer fallback Netlify Forms:', apiErr.message);
        }

        // ─── LAYER 2: Fallback ke Netlify Forms native POST ───
        if (!isSuccess) {
          try {
            const formName = form.getAttribute('name') || formId;
            const netlifyParams = new URLSearchParams();
            netlifyParams.append('form-name', formName);
            netlifyParams.append('name', name);
            if (email) netlifyParams.append('email', email);
            netlifyParams.append('phone', phone);
            netlifyParams.append('program', program);
            netlifyParams.append('message', message);
            netlifyParams.append('serviceType', serviceType);
            netlifyParams.append('serviceName', serviceName);

            const netlifyRes = await fetch('/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: netlifyParams.toString()
            });

            if (netlifyRes.ok) {
              isSuccess = true;
            }
          } catch (nfErr) {
            console.warn('[BIN Contact] Netlify Forms fallback error:', nfErr.message);
          }
        }

        // ─── LAYER 3: Sinkronisasi Firestore di background (Non-blocking / fire-and-forget) ───
        try {
          if (window._firebaseDb) {
            window._firebaseDb.collection('contact_submissions').add(submitData).catch(fbErr => {
              console.warn('[BIN Contact] Firestore sync skipped:', fbErr.message);
            });
          }
        } catch (fbErr) {
          console.warn('[BIN Contact] Firestore sync skipped:', fbErr.message);
        }

        // ─── LAYER 4: Simpan Cadangan Lokal di Browser ───
        try {
          const backupList = JSON.parse(localStorage.getItem('bin_submissions_backup') || '[]');
          backupList.unshift(submitData);
          localStorage.setItem('bin_submissions_backup', JSON.stringify(backupList.slice(0, 50)));
        } catch (e) {}

        // ─── FINAL FEEDBACK TO USER ───
        if (isSuccess) {
          let successEl = form.querySelector('.form-success');
          if (!successEl) {
            successEl = document.createElement('div');
            successEl.className = 'form-success';
            successEl.style.marginTop = '1rem';
            form.appendChild(successEl);
          }
          successEl.innerHTML = `<i data-lucide="check-circle" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Pesan Anda berhasil terkirim! Tim ${serviceName} akan menghubungi Anda segera.`;
          successEl.classList.add('show');
          initIcons();

          alert('Pesan Anda berhasil terkirim! Tim ' + serviceName + ' akan menghubungi Anda segera.');
          form.reset();
          formFields.forEach(f => f.style.borderColor = '');

          setTimeout(() => {
            if (successEl) successEl.classList.remove('show');
          }, 6000);
        } else {
          // Jika seluruh jalur online offline/gagal, beri opsi direct WhatsApp
          const waText = encodeURIComponent(`Halo ${serviceName}, saya ${name} ingin menanyakan:\n\n${message}\n(No HP: ${phone})`);
          const confirmWA = confirm('Server sedang dalam pemeliharaan. Ingin meneruskan pesan ini langsung ke WhatsApp resmi kami?');
          if (confirmWA) {
            window.open(`https://wa.me/6281234567890?text=${waText}`, '_blank');
            form.reset();
          } else {
            alert('Pesan Anda telah disimpan secara offline di browser ini dan akan kami proses segera.');
          }
        }
      } catch (err) {
        console.error('[BIN Contact] Unexpected submit error:', err);
        alert('Terjadi kesalahan saat memproses formulir. Silakan coba beberapa saat lagi.');
      } finally {
        if (btn) {
          btn.innerHTML = origBtnText;
          btn.disabled = false;
          initIcons();
        }
      }
    });
  };

  setupFormSubmission('contact-form', 'lpk', 'LPK Buwas Ikigai Nusantara');
  setupFormSubmission('bin-contact-form', 'lpk', 'LPK Buwas Ikigai Nusantara');
  setupFormSubmission('procool-contact-form', 'procool', 'Procool');
  setupFormSubmission('legal-contact-form', 'legal', 'Konsultasi Hukum');
  setupFormSubmission('geoteknik-contact-form', 'geoteknik', 'Jasa Geoteknik');

  // ============================================
  // GALLERY RENDERER & LIGHTBOX INTERACTIVE
  // ============================================
  function renderGallery(gallery) {
    const grid = document.getElementById('gallery-grid');
    if (!grid || !Array.isArray(gallery) || gallery.length === 0) return;
    
    grid.innerHTML = gallery.map((item, index) => `
      <div class="gallery-item reveal-up delay-${(index % 3) + 1} active" data-index="${index}">
        <img src="${item.src}" alt="${item.alt || item.title || 'Galeri'}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/gallery-excavator.png';">
        <div class="gallery-overlay">
          <div class="gallery-zoom"><i data-lucide="zoom-in" style="width:22px;height:22px"></i></div>
          <h4>${item.title || ''}</h4>
          <p>${item.desc || ''}</p>
        </div>
      </div>
    `).join('');
  }

  let currentLightboxIndex = 0;
  let galleryData = [];

  function reinitGallery() {
    const items = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    galleryData = [];
    items.forEach((item, index) => {
      const img = item.querySelector('img');
      const title = item.querySelector('.gallery-overlay h4')?.textContent || '';
      if (img) {
        galleryData.push({ src: img.src, alt: img.alt || '', title });
      }
      
      item.onclick = () => openLightbox(index);
    });
  }

  function openLightbox(index) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    if (!lightbox || !lightboxImg || galleryData.length === 0) return;
    currentLightboxIndex = index;
    lightboxImg.src = galleryData[index].src;
    lightboxImg.alt = galleryData[index].alt || '';
    if (lightboxCaption) lightboxCaption.textContent = galleryData[index].title || '';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function navigateLightbox(direction) {
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    if (galleryData.length === 0 || !lightboxImg) return;
    currentLightboxIndex = (currentLightboxIndex + direction + galleryData.length) % galleryData.length;
    lightboxImg.src = galleryData[currentLightboxIndex].src;
    lightboxImg.alt = galleryData[currentLightboxIndex].alt || '';
    if (lightboxCaption) lightboxCaption.textContent = galleryData[currentLightboxIndex].title || '';
  }

  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightbox = document.getElementById('lightbox');

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
  if (lightboxNext) lightboxNext.addEventListener('click', () => navigateLightbox(1));
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
});
