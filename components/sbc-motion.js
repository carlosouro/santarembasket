/**
 * Santarém Basket Clube - Motion & Micro-UX Progressive Enhancement
 * - Hybrid scroll reveals (one-shot IntersectionObserver for cards/headers, native CSS view() for media masks with IO fallback)
 * - Reading progress bar + auto chapter jump pills on official document pages (Estatutos, Regulamento Interno)
 * - Floating Back-to-Top button on long pages
 * Zero external dependencies, respects prefers-reduced-motion, never hides content if JS/motion is disabled.
 */

(function initSbcMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsViewTimeline =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('(animation-timeline: view()) and (animation-range: entry)');
  const supportsScrollTimeline =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline', 'scroll()');

  const REVEAL_SELECTORS = [
    '.sbc-section-header',
    '.sbc-club-highlight-card',
    '.sbc-destaque-card',
    '.sbc-stat-box',
    '.sbc-member-card',
    '.sbc-partner-card',
    '.sbc-protocol-card',
    '.sbc-contact-info-card',
    '.sbc-form-card',
    '.sbc-map-wrapper',
    '.sbc-doc-download-bar',
    '.sbc-card',
    '.sbc-team-showcase-card',
    '.sbc-palmares-group',
  ].join(', ');

  const MEDIA_REVEAL_SELECTORS = [
    '.sbc-club-highlight-media',
    '.sbc-team-banner-wrap',
    '.sbc-history-feature-media',
  ].join(', ');

  let revealObserver = null;
  let mediaObserver = null;
  const pendingReveals = new Set();

  function markElementRevealed(el) {
    el.classList.add('is-revealed');
    pendingReveals.delete(el);
    if (revealObserver) revealObserver.unobserve(el);
    if (mediaObserver) mediaObserver.unobserve(el);
  }

  function isElementAtOrAboveFold(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return rect.top <= window.innerHeight * 0.96;
  }

  function sweepPendingReveals() {
    if (pendingReveals.size === 0) return;
    pendingReveals.forEach((el) => {
      if (!el.isConnected) {
        pendingReveals.delete(el);
        return;
      }
      if (isElementAtOrAboveFold(el)) {
        markElementRevealed(el);
      }
    });
  }

  function setupRevealObservers() {
    if (prefersReducedMotion.matches || typeof IntersectionObserver === 'undefined') {
      return;
    }

    document.documentElement.classList.add('sbc-motion-ready');

    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight) {
            markElementRevealed(entry.target);
          }
        }
      },
      {
        rootMargin: '0px 0px -16px 0px',
        threshold: 0,
      }
    );

    if (!supportsViewTimeline) {
      mediaObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight) {
              markElementRevealed(entry.target);
            }
          }
        },
        {
          rootMargin: '0px 0px -16px 0px',
          threshold: 0,
        }
      );
    }

    let scrollSweepQueued = false;
    window.addEventListener(
      'scroll',
      () => {
        if (pendingReveals.size === 0 || scrollSweepQueued) return;
        scrollSweepQueued = true;
        window.requestAnimationFrame(() => {
          scrollSweepQueued = false;
          sweepPendingReveals();
        });
      },
      { passive: true }
    );
  }

  function scanAndObserve(root = document) {
    if (!revealObserver) return;

    const candidates = root.querySelectorAll(REVEAL_SELECTORS);
    const parentCounters = new WeakMap();

    candidates.forEach((el) => {
      if (el.hasAttribute('data-sbc-reveal')) return;
      // Hero elements have their own immediate CSS entrance animation
      if (el.closest('.sbc-hero-section')) return;
      // Avoid double-hiding nested cards inside already revealed cards
      if (el.parentElement && el.parentElement.closest('[data-sbc-reveal]')) return;

      const parent = el.parentElement || document.body;
      const idx = parentCounters.get(parent) || 0;
      parentCounters.set(parent, idx + 1);

      const delayMs = Math.min(idx * 55, 300);
      el.style.setProperty('--sbc-reveal-delay', `${delayMs}ms`);
      el.setAttribute('data-sbc-reveal', el.classList.contains('sbc-stat-box') ? 'scale' : 'up');

      if (isElementAtOrAboveFold(el)) {
        markElementRevealed(el);
      } else {
        pendingReveals.add(el);
        revealObserver.observe(el);
      }
    });

    if (mediaObserver) {
      const mediaEls = root.querySelectorAll(MEDIA_REVEAL_SELECTORS);
      mediaEls.forEach((el) => {
        if (el.hasAttribute('data-sbc-media-reveal')) return;
        if (el.closest('.sbc-hero-section')) return;
        el.setAttribute('data-sbc-media-reveal', '');
        if (isElementAtOrAboveFold(el)) {
          markElementRevealed(el);
        } else {
          pendingReveals.add(el);
          mediaObserver.observe(el);
        }
      });
    }
  }

  function revealVisibleNow(root = document) {
    root.querySelectorAll('[data-sbc-reveal]:not(.is-revealed)').forEach((el) => {
      if (isElementAtOrAboveFold(el)) {
        markElementRevealed(el);
      }
    });
  }

  window.sbcRefreshReveals = function sbcRefreshReveals(root = document) {
    scanAndObserve(root);
    revealVisibleNow(root);
  };

  function setupDocumentEnhancements() {
    const docCard = document.querySelector('.sbc-doc-card');
    if (!docCard) return;

    const chapters = Array.from(docCard.querySelectorAll('.sbc-doc-chapter'));
    if (chapters.length === 0) return;

    // 1. Reading Progress Bar (native CSS scroll() with passive scroll fallback)
    if (!document.querySelector('.sbc-reading-progress')) {
      const bar = document.createElement('div');
      bar.className = 'sbc-reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.prepend(bar);

      if (!supportsScrollTimeline) {
        let ticking = false;
        const updateProgress = () => {
          ticking = false;
          const scrollable = document.documentElement.scrollHeight - window.innerHeight;
          const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
          bar.style.transform = `scaleX(${ratio})`;
        };
        window.addEventListener(
          'scroll',
          () => {
            if (!ticking) {
              ticking = true;
              window.requestAnimationFrame(updateProgress);
            }
          },
          { passive: true }
        );
        updateProgress();
      }
    }

    // 2. Auto-built Chapter Jump Pills using existing headings (zero fabricated text)
    if (!document.querySelector('.sbc-doc-toc')) {
      const nav = document.createElement('nav');
      nav.className = 'sbc-doc-toc';
      nav.setAttribute('aria-label', 'Navegação por secções');

      const list = document.createElement('ul');
      list.className = 'sbc-doc-toc-list';

      const linkMap = new Map();

      chapters.forEach((chapter, index) => {
        const numEl = chapter.querySelector('.sbc-doc-chapter-num');
        const titleEl = chapter.querySelector('.sbc-doc-chapter-title');
        const rawTitle = (titleEl ? titleEl.textContent : chapter.textContent || '').trim();
        const rawNum = numEl ? numEl.textContent.trim() : '';
        if (!rawTitle) return;

        if (!chapter.id) {
          chapter.id = `seccao-${index + 1}`;
        }

        const li = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'sbc-doc-toc-link';
        link.href = `#${chapter.id}`;
        link.textContent = rawNum ? `${rawNum} — ${rawTitle}` : rawTitle;
        li.appendChild(link);
        list.appendChild(li);
        linkMap.set(chapter.id, link);
      });

      if (list.children.length > 1) {
        nav.appendChild(list);
        docCard.parentNode.insertBefore(nav, docCard);

        // Highlight current chapter pill while scrolling
        if (typeof IntersectionObserver !== 'undefined') {
          let activeId = null;
          const tocObserver = new IntersectionObserver(
            (entries) => {
              const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
              if (visible.length > 0) {
                const nextId = visible[0].target.id;
                if (nextId !== activeId) {
                  if (activeId && linkMap.has(activeId)) {
                    linkMap.get(activeId).classList.remove('is-active');
                  }
                  activeId = nextId;
                  if (linkMap.has(activeId)) {
                    linkMap.get(activeId).classList.add('is-active');
                  }
                }
              }
            },
            {
              rootMargin: '-96px 0px -65% 0px',
              threshold: 0,
            }
          );

          chapters.forEach((ch) => tocObserver.observe(ch));
        }
      }
    }
  }

  function setupBackToTop() {
    if (document.querySelector('.sbc-back-to-top')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sbc-back-to-top';
    btn.setAttribute('aria-label', 'Voltar ao topo');
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>';

    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      });
    });

    document.body.appendChild(btn);

    let ticking = false;
    const toggleVisibility = () => {
      ticking = false;
      const isLongPage = document.documentElement.scrollHeight > window.innerHeight * 1.45;
      btn.classList.toggle('is-visible', isLongPage && window.scrollY > 460);
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(toggleVisibility);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', toggleVisibility, { passive: true });
    toggleVisibility();
  }

  function boot() {
    setupRevealObservers();
    scanAndObserve(document);
    setupDocumentEnhancements();
    setupBackToTop();

    // Observe dynamically rendered web components (e.g., sbc-destaques, sbc-equipas, sbc-parceiros, sbc-palmares)
    const main = document.getElementById('main-content');
    if (main && revealObserver && typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(() => {
        scanAndObserve(main);
      });
      mo.observe(main, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
