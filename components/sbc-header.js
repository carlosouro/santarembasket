/**
 * Santarém Basket Clube - Custom Header Web Component
 * Standard W3C Custom Element: <sbc-header>
 * Renders the modern symmetrical desktop navigation, centered logo, and mobile off-canvas drawer.
 * Zero external dependencies, pure web standards.
 */

function sbcGetSiteRoot() {
  if (document.documentElement && document.documentElement.dataset.root !== undefined) {
    return document.documentElement.dataset.root;
  }
  const scriptTag = document.querySelector('script[src*="components/sbc-"]');
  if (scriptTag) {
    const src = scriptTag.getAttribute('src') || '';
    const match = src.match(/^(.*?)components\//);
    if (match) return match[1] || './';
  }
  return './';
}

function sbcResolveUrl(path) {
  const root = sbcGetSiteRoot();
  if (!path || path === '/') return root || './';
  if (/^(https?:|\/\/|mailto:|tel:|#)/i.test(path)) {
    return path;
  }
  const cleanPath = path.replace(/^(\.\/|\/)+/, '');
  return root + cleanPath;
}

window.sbcGetSiteRoot = sbcGetSiteRoot;
window.sbcResolveUrl = sbcResolveUrl;

class SbcHeader extends HTMLElement {
  connectedCallback() {
    this.render();
    this.setActiveItem();
    this.setupScrollHandler();
    this.setupMobileMenu();
  }

  render() {
    const r = sbcResolveUrl;
    const homeHref = r('');
    const logoSrc = r('wp-content/uploads/2023/06/cropped-89824145_3027466430646495_3387208941329973248_n-2.png');

    this.innerHTML = `
<header id="main-header" class="sbc-modern-header">
  <div class="sbc-header-inner">
    <!-- Left Navigation Wing -->
    <nav class="sbc-nav-wing sbc-nav-wing-left" aria-label="Navegação Esquerda">
      <ul class="sbc-nav-list">
        <!-- Clube Dropdown -->
        <li class="sbc-nav-item sbc-has-dropdown" data-nav="clube">
          <a href="${homeHref}" class="sbc-nav-link" aria-expanded="false">
            CLUBE
            <svg class="sbc-chevron" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <ul class="sbc-dropdown">
            <li class="sbc-dropdown-item"><a href="${r('historia/')}" class="sbc-dropdown-link">HISTÓRIA</a></li>
            <li class="sbc-dropdown-item"><a href="${r('orgaos-sociais/')}" class="sbc-dropdown-link">ÓRGÃOS SOCIAIS</a></li>
            <li class="sbc-dropdown-item"><a href="${r('estatutos/')}" class="sbc-dropdown-link">ESTATUTOS</a></li>
            <li class="sbc-dropdown-item"><a href="${r('regulamento-interno/')}" class="sbc-dropdown-link">REGULAMENTO INTERNO</a></li>
            <li class="sbc-dropdown-item"><a href="${r('palmares/')}" class="sbc-dropdown-link">PALMARÉS</a></li>
            <li class="sbc-dropdown-item"><a href="${r('parceiros/')}" class="sbc-dropdown-link">PARCEIROS & PROTOCOLOS</a></li>
            <li class="sbc-dropdown-item"><a href="${r('contacto/')}" class="sbc-dropdown-link">CONTACTO</a></li>
          </ul>
        </li>

        <!-- Equipas Dropdown -->
        <li class="sbc-nav-item sbc-has-dropdown" data-nav="equipas">
          <a href="${r('equipas/')}" class="sbc-nav-link" aria-expanded="false">
            EQUIPAS
            <svg class="sbc-chevron" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <ul class="sbc-dropdown">
            <li class="sbc-dropdown-item"><a href="${r('equipas/')}" class="sbc-dropdown-link">TODAS AS EQUIPAS</a></li>
            <li class="sbc-dropdown-item"><a href="${r('treinos/')}" class="sbc-dropdown-link">HORÁRIO DOS TREINOS</a></li>
            <li class="sbc-dropdown-item"><a href="${r('equipas/#minibasquete')}" class="sbc-dropdown-link">MINIBASQUETE</a></li>
            <li class="sbc-dropdown-item"><a href="${r('equipas/#masculinas')}" class="sbc-dropdown-link">MASCULINAS</a></li>
            <li class="sbc-dropdown-item"><a href="${r('equipas/#femininas')}" class="sbc-dropdown-link">FEMININAS</a></li>
          </ul>
        </li>
      </ul>
    </nav>

    <!-- Center Logo -->
    <a href="${homeHref}" class="sbc-logo-anchor" title="Santarém Basket Clube - Página Inicial">
      <img src="${logoSrc}" alt="Santarém Basket Clube" class="sbc-logo-img" />
    </a>

    <!-- Right Navigation Wing -->
    <nav class="sbc-nav-wing sbc-nav-wing-right" aria-label="Navegação Direita">
      <ul class="sbc-nav-list">
        <li class="sbc-nav-item" data-nav="merchandising">
          <a href="${r('merchandising/')}" class="sbc-nav-link">MERCHANDISING</a>
        </li>
        <li class="sbc-nav-item" data-nav="socios">
          <a href="${r('socios/')}" class="sbc-btn-socio">SER SÓCIO</a>
        </li>
      </ul>
    </nav>

    <!-- Mobile Hamburger Toggle -->
    <button class="sbc-mobile-toggle" aria-label="Abrir Menu de Navegação" aria-expanded="false" aria-controls="sbc-mobile-drawer">
      <span class="sbc-hamburger-icon"></span>
    </button>
  </div>
</header>

<!-- Mobile Off-Canvas Overlay -->
<div class="sbc-mobile-overlay" id="sbc-mobile-overlay"></div>

<!-- Mobile Off-Canvas Drawer -->
<div class="sbc-mobile-drawer" id="sbc-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu Principal">
  <div class="sbc-mobile-drawer-header">
    <img src="${logoSrc}" alt="Santarém Basket Clube" class="sbc-mobile-drawer-logo" />
    <span class="sbc-mobile-drawer-title">Santarém Basket Clube</span>
  </div>

  <ul class="sbc-mobile-menu-list">
    <!-- Clube Accordion -->
    <li class="sbc-mobile-item" data-nav="clube">
      <div class="sbc-mobile-link-row">
        <a href="${homeHref}" class="sbc-mobile-link">CLUBE</a>
        <button class="sbc-accordion-toggle" aria-label="Expandir submenu Clube">
          <svg width="12" height="8" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </button>
      </div>
      <ul class="sbc-mobile-submenu">
        <li><a href="${r('historia/')}" class="sbc-mobile-sublink">História</a></li>
        <li><a href="${r('orgaos-sociais/')}" class="sbc-mobile-sublink">Órgãos Sociais</a></li>
        <li><a href="${r('estatutos/')}" class="sbc-mobile-sublink">Estatutos</a></li>
        <li><a href="${r('regulamento-interno/')}" class="sbc-mobile-sublink">Regulamento Interno</a></li>
        <li><a href="${r('palmares/')}" class="sbc-mobile-sublink">Palmarés</a></li>
        <li><a href="${r('parceiros/')}" class="sbc-mobile-sublink">Parceiros & Protocolos</a></li>
        <li><a href="${r('contacto/')}" class="sbc-mobile-sublink">Contacto</a></li>
      </ul>
    </li>

    <!-- Equipas Accordion -->
    <li class="sbc-mobile-item" data-nav="equipas">
      <div class="sbc-mobile-link-row">
        <a href="${r('equipas/')}" class="sbc-mobile-link">EQUIPAS</a>
        <button class="sbc-accordion-toggle" aria-label="Expandir submenu Equipas">
          <svg width="12" height="8" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </button>
      </div>
      <ul class="sbc-mobile-submenu">
        <li><a href="${r('equipas/')}" class="sbc-mobile-sublink">Todas as Equipas</a></li>
        <li><a href="${r('treinos/')}" class="sbc-mobile-sublink">Horário dos Treinos</a></li>
        <li><a href="${r('equipas/#minibasquete')}" class="sbc-mobile-sublink">Minibasquete</a></li>
        <li><a href="${r('equipas/#masculinas')}" class="sbc-mobile-sublink">Masculinas</a></li>
        <li><a href="${r('equipas/#femininas')}" class="sbc-mobile-sublink">Femininas</a></li>
      </ul>
    </li>

    <li class="sbc-mobile-item" data-nav="merchandising">
      <a href="${r('merchandising/')}" class="sbc-mobile-link">MERCHANDISING</a>
    </li>

    <li class="sbc-mobile-item" data-nav="contacto">
      <a href="${r('contacto/')}" class="sbc-mobile-link">CONTACTO</a>
    </li>
  </ul>

  <div class="sbc-mobile-drawer-cta">
    <a href="${r('socios/')}" class="sbc-btn-socio" style="display: block; width: 100%;">SER SÓCIO</a>
  </div>
</div>
    `;
  }

  setupScrollHandler() {
    const header = this.querySelector('#main-header');
    if (!header) return;

    const onScroll = () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  setActiveItem() {
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
    const allLinks = this.querySelectorAll('a[href]');
    const rootPath = new URL(sbcResolveUrl(''), window.location.href).pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';

    allLinks.forEach(link => {
      try {
        const linkUrl = new URL(link.href, window.location.href);
        if (linkUrl.hash) return;
        const linkPath = linkUrl.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
        if (linkPath === currentPath && linkPath !== rootPath) {
          link.classList.add('active');
          const parentItem = link.closest('.sbc-nav-item, .sbc-mobile-item');
          if (parentItem) {
            parentItem.classList.add('active');
          }
        }
      } catch (e) {}
    });

    // Parent group detection across any subdirectory hosting
    if (['/historia', '/orgaos-sociais', '/estatutos', '/regulamento-interno', '/palmares', '/titulos-nacionais', '/parceiros', '/contacto'].some(p => currentPath.endsWith(p) || currentPath.includes(p + '/'))) {
      const clubeItems = this.querySelectorAll('[data-nav="clube"]');
      clubeItems.forEach(el => el.classList.add('active'));
    }

    if (['/equipas', '/treinos', '/team', '/player'].some(p => currentPath.endsWith(p) || currentPath.includes(p + '/'))) {
      const equipasItems = this.querySelectorAll('[data-nav="equipas"]');
      equipasItems.forEach(el => el.classList.add('active'));
    }

    if (['/socios', '/novo-socio'].some(p => currentPath.endsWith(p) || currentPath.includes(p + '/'))) {
      const sociosItems = this.querySelectorAll('[data-nav="socios"]');
      sociosItems.forEach(el => el.classList.add('active'));
    }

    if (['/merchandising', '/equipamentos'].some(p => currentPath.endsWith(p) || currentPath.includes(p + '/'))) {
      const merchItems = this.querySelectorAll('[data-nav="merchandising"]');
      merchItems.forEach(el => el.classList.add('active'));
    }
  }

  setupMobileMenu() {
    const toggleBtn = this.querySelector('.sbc-mobile-toggle');
    const overlay = this.querySelector('#sbc-mobile-overlay');
    const drawer = this.querySelector('#sbc-mobile-drawer');

    if (!toggleBtn || !overlay || !drawer) return;

    const openMenu = () => {
      toggleBtn.classList.add('is-active');
      toggleBtn.setAttribute('aria-expanded', 'true');
      overlay.classList.add('is-open');
      drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      toggleBtn.classList.remove('is-active');
      toggleBtn.setAttribute('aria-expanded', 'false');
      overlay.classList.remove('is-open');
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    toggleBtn.addEventListener('click', () => {
      if (drawer.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    overlay.addEventListener('click', closeMenu);

    // Accordion toggles inside mobile drawer
    const accordionBtns = this.querySelectorAll('.sbc-accordion-toggle');
    accordionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const row = btn.closest('.sbc-mobile-item');
        const submenu = row ? row.querySelector('.sbc-mobile-submenu') : null;
        if (submenu) {
          const isExpanded = btn.classList.contains('expanded');
          btn.classList.toggle('expanded', !isExpanded);
          submenu.classList.toggle('expanded', !isExpanded);
        }
      });
    });
  }
}

customElements.define('sbc-header', SbcHeader);
