/**
 * BIN — Main Application JavaScript
 * All interactive features: navbar, parallax, counter, gallery,
 * testimonial slider, FAQ accordion, contact form, floating buttons
 * + Dynamic content loading from API
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  const initIcons = () => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  };
  initIcons();

  // ============================================
  // DYNAMIC CONTENT LOADING FROM API
  // ============================================
  async function loadDynamicContent() {
    try {
      const response = await fetch('/api/content');
      if (!response.ok) throw new Error('API unreachable');
      const data = await response.json();
      
      renderHero(data.content.hero);
      renderAbout(data.content.about);
      renderVisiMisi(data.content.visi_misi);
      renderContactInfo(data.content.contact_info);
      renderGallery(data.gallery);
      renderTestimonials(data.testimonials);
      renderPartners(data.partners);
      renderFaq(data.faq);
      
      // Re-initialize dynamic elements since DOM updated
      initIcons();
      reinitFaq();
      reinitGallery();
      reinitTestimonials();
    } catch (err) {
      console.log('Using static content fallback:', err.message);
    }
  }

  function renderHero(hero) {
    if (!hero) return;
    const badgeEl = document.querySelector('.hero-badge');
    const titleEl = document.querySelector('.hero-title');
    const subtitleEl = document.querySelector('.hero-subtitle');
    
    if (badgeEl) badgeEl.innerHTML = `<i data-lucide="shield-check" style="width:16px;height:16px"></i> ${hero.badge}`;
    if (titleEl) {
      // Highlight the last word or 'Alat Berat'
      const titleText = hero.title;
      const highlightWord = 'Alat Berat';
      if (titleText.includes(highlightWord)) {
        titleEl.innerHTML = titleText.replace(highlightWord, `<span class="highlight">${highlightWord}</span>`);
      } else {
        titleEl.textContent = titleText;
      }
    }
    if (subtitleEl) subtitleEl.textContent = hero.subtitle;
  }

  function renderAbout(about) {
    if (!about) return;
    const titleEl = document.querySelector('.about-content h2');
    const badgeNumEl = document.querySelector('.about-badge .badge-number');
    const pElements = document.querySelectorAll('.about-content p');
    
    if (titleEl) titleEl.textContent = about.title;
    if (badgeNumEl) badgeNumEl.textContent = about.experience;
    
    // Replace description paragraphs
    const contentDiv = document.querySelector('.about-content');
    if (contentDiv) {
      // Remove old paragraph elements
      const existingPs = contentDiv.querySelectorAll('p');
      existingPs.forEach(p => p.remove());
      
      // Insert new ones before the features block
      const featuresEl = contentDiv.querySelector('.about-features');
      const newPs = [about.desc1, about.desc2, about.desc3].filter(Boolean);
      newPs.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        contentDiv.insertBefore(p, featuresEl);
      });
    }
  }

  function renderVisiMisi(vm) {
    if (!vm) return;
    const visiEl = document.querySelector('.visi-card h3');
    if (visiEl) visiEl.textContent = vm.visi;
    
    const misiGrid = document.querySelector('.misi-grid');
    if (misiGrid && Array.isArray(vm.misi)) {
      misiGrid.innerHTML = vm.misi.map((misiText, index) => `
        <div class="misi-card reveal-up delay-${index + 1} active">
          <div class="misi-number">${index + 1}</div>
          <h4>${misiText}</h4>
        </div>
      `).join('');
    }
  }

  function renderContactInfo(contact) {
    if (!contact) return;
    
    // Update contact section cards
    const cards = document.querySelectorAll('.contact-info-card');
    if (cards.length >= 4) {
      cards[0].querySelector('p').textContent = contact.address;
      cards[1].querySelector('p').textContent = contact.phone;
      cards[2].querySelector('p').textContent = contact.email;
      cards[3].querySelector('p').innerHTML = contact.hours.replace(/\n/g, '<br>');
    }
    
    // Update footer contacts
    const footerContacts = document.querySelectorAll('.footer-contact-item p');
    if (footerContacts.length >= 4) {
      footerContacts[0].textContent = contact.address;
      footerContacts[1].textContent = contact.phone;
      footerContacts[2].textContent = contact.email;
      footerContacts[3].textContent = contact.hours.replace(/\n/g, ', ');
    }

    // Update WhatsApp floating link
    const waFloat = document.getElementById('whatsapp-btn');
    if (waFloat && contact.whatsapp) {
      waFloat.href = `https://wa.me/${contact.whatsapp}?text=Halo%20BIN%2C%20saya%20ingin%20bertanya%20tentang%20program%20pelatihan`;
    }
  }

  function renderGallery(gallery) {
    const grid = document.getElementById('gallery-grid');
    if (!grid || !Array.isArray(gallery) || gallery.length === 0) return;
    
    grid.innerHTML = gallery.map((item, index) => `
      <div class="gallery-item reveal-up delay-${(index % 3) + 1} active" data-index="${index}">
        <img src="${item.src}" alt="${item.alt}" loading="lazy">
        <div class="gallery-overlay">
          <div class="gallery-zoom"><i data-lucide="zoom-in" style="width:22px;height:22px"></i></div>
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
        </div>
      </div>
    `).join('');
  }

  function renderTestimonials(testimonials) {
    const track = document.getElementById('testimonial-track');
    const dotsContainer = document.getElementById('testimonial-dots');
    if (!track || !Array.isArray(testimonials) || testimonials.length === 0) return;
    
    track.innerHTML = testimonials.map(item => `
      <div class="testimonial-card">
        <div class="testimonial-quote-icon">
          <i data-lucide="quote" style="width:40px;height:40px"></i>
        </div>
        <div class="testimonial-stars">
          ${Array(item.rating || 5).fill('<i data-lucide="star" style="width:18px;height:18px;fill:currentColor"></i>').join('')}
        </div>
        <p class="testimonial-text">"${item.text}"</p>
        <div class="testimonial-author">
          <div class="testimonial-avatar">${item.avatar || item.name[0]}</div>
          <div class="testimonial-author-info">
            <h4>${item.name}</h4>
            <p>${item.program}</p>
          </div>
        </div>
      </div>
    `).join('');

    if (dotsContainer) {
      dotsContainer.innerHTML = testimonials.map((_, index) => `
        <div class="testimonial-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
      `).join('');
    }
  }

  function renderPartners(partners) {
    const track = document.getElementById('partner-track');
    if (!track || !Array.isArray(partners) || partners.length === 0) return;
    
    // Create dual sets for infinite scroll
    const firstSet = partners.map(p => `<div class="partner-logo"><span>${p.name}</span></div>`).join('');
    track.innerHTML = firstSet + firstSet;
  }

  function renderFaq(faq) {
    const container = document.querySelector('.faq-container');
    if (!container || !Array.isArray(faq) || faq.length === 0) return;
    
    container.innerHTML = faq.map((item, index) => `
      <div class="faq-item ${index === 0 ? 'active' : ''} reveal-up delay-${(index % 3) + 1} active">
        <div class="faq-question" role="button" tabindex="0" aria-expanded="${index === 0 ? 'true' : 'false'}">
          <span>${item.question}</span>
          <div class="faq-icon"><i data-lucide="chevron-down" style="width:18px;height:18px"></i></div>
        </div>
        <div class="faq-answer">
          <p>${item.answer}</p>
        </div>
      </div>
    `).join('');
  }

  // ============================================
  // NAVBAR — Sticky + Scroll Effect
  // ============================================
  const navbar = document.getElementById('navbar');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function handleNavScroll() {
    const scrollY = window.scrollY;

    // Sticky effect
    if (scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active link highlight
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });

  // ============================================
  // MOBILE MENU
  // ============================================
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  function toggleMobileMenu() {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    hamburger.setAttribute('aria-expanded', mobileMenu.classList.contains('active'));
  }

  function closeMobileMenu() {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('active');
    mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', toggleMobileMenu);
  mobileOverlay.addEventListener('click', closeMobileMenu);
  mobileNavLinks.forEach(link => link.addEventListener('click', closeMobileMenu));

  // ============================================
  // HERO PARALLAX
  // ============================================
  const heroBg = document.getElementById('hero-bg');

  function handleParallax() {
    if (heroBg && window.innerWidth > 768) {
      const scrollY = window.scrollY;
      heroBg.style.transform = `translateY(${scrollY * 0.4}px)`;
    }
  }

  window.addEventListener('scroll', handleParallax, { passive: true });

  // ============================================
  // SCROLL REVEAL (Intersection Observer)
  // ============================================
  const revealElements = document.querySelectorAll(
    '.reveal, .reveal-up, .reveal-down, .reveal-left, .reveal-right, .reveal-scale'
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
  );

  revealElements.forEach(el => revealObserver.observe(el));

  // ============================================
  // ANIMATED COUNTER
  // ============================================
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  let countersStarted = false;

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'));
    const suffix = el.querySelector('.stat-suffix')?.textContent || '';
    const duration = 2000;
    const startTime = performance.now();

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const current = Math.floor(easedProgress * target);

      el.innerHTML = current.toLocaleString('id-ID') + `<span class="stat-suffix">${suffix}</span>`;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    }

    requestAnimationFrame(updateCounter);
  }

  const statsSection = document.getElementById('statistik');
  if (statsSection) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !countersStarted) {
            countersStarted = true;
            statNumbers.forEach(el => animateCounter(el));
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    counterObserver.observe(statsSection);
  }

  // ============================================
  // GALLERY LIGHTBOX (Reactive initialization)
  // ============================================
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  let currentLightboxIndex = 0;
  let galleryData = [];

  function reinitGallery() {
    const items = document.querySelectorAll('.gallery-item');
    galleryData = [];
    items.forEach((item, index) => {
      const img = item.querySelector('img');
      const title = item.querySelector('.gallery-overlay h4')?.textContent || '';
      galleryData.push({ src: img.src, alt: img.alt, title });
      
      // Bind click event
      item.addEventListener('click', () => openLightbox(index));
    });
  }

  function openLightbox(index) {
    if (galleryData.length === 0) return;
    currentLightboxIndex = index;
    lightboxImg.src = galleryData[index].src;
    lightboxImg.alt = galleryData[index].alt;
    lightboxCaption.textContent = galleryData[index].title;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    if (galleryData.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex + direction + galleryData.length) % galleryData.length;
    lightboxImg.src = galleryData[currentLightboxIndex].src;
    lightboxImg.alt = galleryData[currentLightboxIndex].alt;
    lightboxCaption.textContent = galleryData[currentLightboxIndex].title;
  }

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

  // ============================================
  // TESTIMONIAL SLIDER (Reactive initialization)
  // ============================================
  const testimonialTrack = document.getElementById('testimonial-track');
  const prevBtn = document.getElementById('testimonial-prev');
  const nextBtn = document.getElementById('testimonial-next');
  let testimonialCards = [];
  let currentSlide = 0;
  let autoSlideInterval;

  function reinitTestimonials() {
    if (!testimonialTrack) return;
    testimonialCards = testimonialTrack.querySelectorAll('.testimonial-card');
    
    // Rebind dots
    const dots = document.querySelectorAll('.testimonial-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        stopAutoSlide();
        currentSlide = parseInt(dot.getAttribute('data-index'));
        updateTestimonialSlider();
        startAutoSlide();
      });
    });

    updateTestimonialSlider();
  }

  function getVisibleCards() {
    if (window.innerWidth <= 640) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  }

  function updateTestimonialSlider() {
    if (!testimonialTrack || testimonialCards.length === 0) return;
    const visibleCards = getVisibleCards();
    const maxSlide = Math.max(0, testimonialCards.length - visibleCards);
    currentSlide = Math.min(currentSlide, maxSlide);

    const cardWidth = testimonialCards[0].offsetWidth + 24; // card width + gap
    testimonialTrack.style.transform = `translateX(-${currentSlide * cardWidth}px)`;

    const dots = document.querySelectorAll('.testimonial-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function nextSlide() {
    if (testimonialCards.length === 0) return;
    const visibleCards = getVisibleCards();
    const maxSlide = Math.max(0, testimonialCards.length - visibleCards);
    currentSlide = currentSlide >= maxSlide ? 0 : currentSlide + 1;
    updateTestimonialSlider();
  }

  function prevSlide() {
    if (testimonialCards.length === 0) return;
    const visibleCards = getVisibleCards();
    const maxSlide = Math.max(0, testimonialCards.length - visibleCards);
    currentSlide = currentSlide <= 0 ? maxSlide : currentSlide - 1;
    updateTestimonialSlider();
  }

  function startAutoSlide() {
    if (testimonialCards.length === 0) return;
    stopAutoSlide();
    autoSlideInterval = setInterval(nextSlide, 5000);
  }

  function stopAutoSlide() {
    clearInterval(autoSlideInterval);
  }

  if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoSlide(); nextSlide(); startAutoSlide(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoSlide(); prevSlide(); startAutoSlide(); });

  if (testimonialTrack) {
    testimonialTrack.addEventListener('mouseenter', stopAutoSlide);
    testimonialTrack.addEventListener('mouseleave', startAutoSlide);
  }

  window.addEventListener('resize', updateTestimonialSlider);

  // ============================================
  // FAQ ACCORDION (Reactive initialization)
  // ============================================
  function reinitFaq() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(item => {
      const question = item.querySelector('.faq-question');
      
      // Remove old event listeners by cloning if necessary, but direct assignment is fine
      const newQuestion = question.cloneNode(true);
      question.parentNode.replaceChild(newQuestion, question);

      newQuestion.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all
        items.forEach(faq => {
          faq.classList.remove('active');
          faq.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });

        // Open clicked if it wasn't active
        if (!isActive) {
          item.classList.add('active');
          newQuestion.setAttribute('aria-expanded', 'true');
        }
      });

      // Keyboard support
      newQuestion.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          newQuestion.click();
        }
      });
    });
  }

  // ============================================
  // CONTACT FORM VALIDATION & POST
  // ============================================
  const contactForm = document.getElementById('contact-form');
  const formSuccess = document.getElementById('form-success');

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[\d\s\-\+\(\)]{8,}$/.test(phone);
  }

  function validateField(field) {
    const value = field.value.trim();
    let isValid = true;

    if (field.hasAttribute('required') && !value) {
      isValid = false;
    } else if (field.type === 'email' && value && !validateEmail(value)) {
      isValid = false;
    } else if (field.type === 'tel' && value && !validatePhone(value)) {
      isValid = false;
    }

    field.classList.toggle('error', !isValid);
    return isValid;
  }

  if (contactForm) {
    // Live validation
    contactForm.querySelectorAll('.form-control').forEach(field => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.classList.contains('error')) validateField(field);
      });
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fields = contactForm.querySelectorAll('.form-control[required]');
      let allValid = true;

      fields.forEach(field => {
        if (!validateField(field)) allValid = false;
      });

      if (allValid) {
        // Collect form data
        const formData = {
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          phone: document.getElementById('phone').value,
          program: document.getElementById('program-select').value,
          message: document.getElementById('message').value
        };

        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          
          if (!res.ok) throw new Error('Gagal mengirim pesan');

          // Show success message
          formSuccess.classList.add('show');
          contactForm.reset();

          // Hide success message after 5 seconds
          setTimeout(() => {
            formSuccess.classList.remove('show');
          }, 5000);
        } catch (err) {
          alert('Gagal mengirim pesan. Silakan coba kembali beberapa saat lagi.');
        }
      }
    });
  }

  // ============================================
  // BACK TO TOP
  // ============================================
  const backToTop = document.getElementById('back-to-top');

  function handleBackToTop() {
    if (backToTop) {
      if (window.scrollY > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }
  }

  window.addEventListener('scroll', handleBackToTop, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ============================================
  // SMOOTH SCROLL for anchor links
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = navbar.offsetHeight + 16;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

  // Initialize scroll handlers on load
  handleNavScroll();
  handleBackToTop();

  // Load content dynamically from server
  loadDynamicContent();

  // Static initialization (as fallback)
  reinitGallery();
  reinitTestimonials();
  reinitFaq();
});
