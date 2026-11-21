/**
 * Santarém Basket Clube - Motion & Micro-UX Progressive Enhancement
 * - Compositor-friendly hybrid scroll reveals:
 *   * One-shot IntersectionObserver with same-batch-only stagger (0ms lag on 1-column mobile)
 *   * Batched read-before-write safety sweep (zero layout thrashing)
 *   * Native CSS view() GPU curtain for club/team photography with IO fallback
 * - Reading progress bar + auto chapter jump pills on official document pages
 * - Floating Back-to-Top button with cached viewport height (zero scroll-frame layout reads)
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
  let onContentHeightChanged = null;
  const pendingReveals = new Set();

  function revealBatch(elements) {
    if (elements.length === 0) return;

    // Stagger only items entering in the same viewport batch (e.g. desktop multi-column row);
    // single vertically-scrolled cards on mobile always start immediately at 0ms.
    const staggerStep = elements.length > 1 ? 45 : 0;
    elements.forEach((el, idx) => {
      if (staggerStep > 0) {
        el.style.setProperty('--sbc-reveal-delay', `${Math.min(idx * staggerStep, 180)}ms`);
      } else {
        el.style.removeProperty('--sbc-reveal-delay');
      }
      el.classList.add('is-revealed');
      pendingReveals.delete(el);
      if (revealObserver) revealObserver.unobserve(el);
      if (mediaObserver) mediaObserver.unobserve(el);
    });
  }

  function sweepPendingReveals() {
    if (pendingReveals.size === 0) return;
    const thresholdY = window.innerHeight + 80;
    const toReveal = [];

    // Pass 1: Read all rects first (prevents read-write layout thrashing)
    pendingReveals.forEach((el) => {
      if (!el.isConnected) {
        pendingReveals.delete(el);
        return;
      }
      const rect = el.getBoundingClientRect();
      if ((rect.width > 0 || rect.height > 0) && rect.top <= thresholdY) {
        toReveal.push(el);
      }
    });

    // Pass 2: Mutate classes together
    if (toReveal.length > 0) {
      revealBatch(toReveal);
    }
  }

  function setupRevealObservers() {
    if (prefersReducedMotion.matches || typeof IntersectionObserver === 'undefined') {
      return;
    }

    document.documentElement.classList.add('sbc-motion-ready');

    const handleEntries = (entries) => {
      const entering = [];
      const viewportH = window.innerHeight + 80;
      for (const entry of entries) {
        if (entry.isIntersecting || entry.boundingClientRect.top <= viewportH) {
          entering.push(entry.target);
        }
      }
      if (entering.length > 0) {
        revealBatch(entering);
      }
    };

    // Positive bottom rootMargin triggers reveals 80px before entering the screen
    // so cards are already moving in smoothly during fast mobile flicks.
    revealObserver = new IntersectionObserver(handleEntries, {
      rootMargin: '0px 0px 80px 0px',
      threshold: 0,
    });

    if (!supportsViewTimeline) {
      mediaObserver = new IntersectionObserver(handleEntries, {
        rootMargin: '0px 0px 40px 0px',
        threshold: 0,
      });
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

    const candidates = Array.from(root.querySelectorAll(REVEAL_SELECTORS)).filter((el) => {
      if (el.hasAttribute('data-sbc-reveal')) return false;
      if (el.closest('.sbc-hero-section')) return false;
      if (el.parentElement && el.parentElement.closest('[data-sbc-reveal]')) return false;
      return true;
    });

    const thresholdY = window.innerHeight + 40;

    // Pass 1: Read rects before any DOM attribute/class mutations
    const measured = candidates.map((el) => {
      const rect = el.getBoundingClientRect();
      const visibleNow = (rect.width > 0 || rect.height > 0) && rect.top <= thresholdY;
      return { el, visibleNow };
    });

    // Pass 2: Write attributes & register observers
    const initialVisible = [];
    measured.forEach(({ el, visibleNow }) => {
      el.setAttribute('data-sbc-reveal', el.classList.contains('sbc-stat-box') ? 'scale' : 'up');
      if (visibleNow) {
        initialVisible.push(el);
      } else {
        pendingReveals.add(el);
        revealObserver.observe(el);
      }
    });

    if (initialVisible.length > 0) {
      revealBatch(initialVisible);
    }

    if (mediaObserver) {
      const mediaCandidates = Array.from(root.querySelectorAll(MEDIA_REVEAL_SELECTORS)).filter(
        (el) => !el.hasAttribute('data-sbc-media-reveal') && !el.closest('.sbc-hero-section')
      );
      const mediaMeasured = mediaCandidates.map((el) => {
        const rect = el.getBoundingClientRect();
        const visibleNow = (rect.width > 0 || rect.height > 0) && rect.top <= thresholdY;
        return { el, visibleNow };
      });
      const initialMedia = [];
      mediaMeasured.forEach(({ el, visibleNow }) => {
        el.setAttribute('data-sbc-media-reveal', '');
        if (visibleNow) {
          initialMedia.push(el);
        } else {
          pendingReveals.add(el);
          mediaObserver.observe(el);
        }
      });
      if (initialMedia.length > 0) {
        revealBatch(initialMedia);
      }
    }
  }

  window.sbcRefreshReveals = function sbcRefreshReveals(root = document) {
    scanAndObserve(root);
    sweepPendingReveals();
  };

  function setupDocumentEnhancements() {
    const docCard = document.querySelector('.sbc-doc-card');
    if (!docCard) return;

    const chapters = Array.from(docCard.querySelectorAll('.sbc-doc-chapter'));
    if (chapters.length === 0) return;

    // 1. Reading Progress Bar (native CSS scroll() with cached-height passive fallback)
    if (!document.querySelector('.sbc-reading-progress')) {
      const bar = document.createElement('div');
      bar.className = 'sbc-reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.prepend(bar);

      if (!supportsScrollTimeline) {
        let scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        let ticking = false;

        const recalc = () => {
          scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        };

        const updateProgress = () => {
          ticking = false;
          const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
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
        window.addEventListener('resize', recalc, { passive: true });
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

    // Cache page height on load/resize so scroll ticks never trigger layout reads
    let isLongPage = document.documentElement.scrollHeight > window.innerHeight * 1.45;
    let isVisible = false;
    let ticking = false;

    const recalcPageHeight = () => {
      isLongPage = document.documentElement.scrollHeight > window.innerHeight * 1.45;
      updateVisibility();
    };
    onContentHeightChanged = recalcPageHeight;

    const updateVisibility = () => {
      ticking = false;
      const nextVisible = isLongPage && window.scrollY > 460;
      if (nextVisible !== isVisible) {
        isVisible = nextVisible;
        btn.classList.toggle('is-visible', nextVisible);
      }
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(updateVisibility);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', recalcPageHeight, { passive: true });
    window.addEventListener('load', recalcPageHeight, { once: true });
    updateVisibility();
  }

  function boot() {
    setupRevealObservers();
    scanAndObserve(document);
    setupDocumentEnhancements();
    setupBackToTop();

    // Debounced rAF observer for async web component renders (never scans mid-hover)
    const main = document.getElementById('main-content');
    if (main && revealObserver && typeof MutationObserver !== 'undefined') {
      let scanQueued = false;
      const mo = new MutationObserver((mutations) => {
        if (scanQueued) return;
        const hasAddedElements = mutations.some(
          (m) => m.addedNodes && m.addedNodes.length > 0
        );
        if (!hasAddedElements) return;
        scanQueued = true;
        window.requestAnimationFrame(() => {
          scanQueued = false;
          scanAndObserve(main);
          if (onContentHeightChanged) onContentHeightChanged();
        });
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
