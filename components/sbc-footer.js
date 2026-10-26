/**
 * Santarém Basket Clube - Custom Footer Web Component
 * Standard W3C Custom Element: <sbc-footer>
 * Renders social links (Facebook, Instagram, YouTube/SBCTV), club contacts, location, and copyright.
 * Zero external dependencies, pure web standards.
 */

function sbcFooterResolveUrl(path) {
  if (typeof window.sbcResolveUrl === 'function') {
    return window.sbcResolveUrl(path);
  }
  const root = (document.documentElement && document.documentElement.dataset.root !== undefined)
    ? document.documentElement.dataset.root
    : './';
  if (!path || path === '/') return root || './';
  if (/^(https?:|\/\/|mailto:|tel:|#)/i.test(path)) return path;
  return root + path.replace(/^(\.\/|\/)+/, '');
}

class SbcFooter extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    const r = sbcFooterResolveUrl;
    this.innerHTML = `
<footer id="main-footer" class="sbc-modern-footer">
  <div class="sbc-footer-container">
    <!-- Coluna 1: O Clube & Redes Sociais -->
    <div class="sbc-footer-col">
      <h4>Santarém Basket Clube</h4>
      <p class="sbc-footer-desc">
        Fundado a 12 de Agosto de 1998. Formação desportiva, competição e paixão pelo basquetebol na cidade de Santarém.
      </p>
      <div class="sbc-footer-socials">
        <!-- Facebook -->
        <a href="https://www.facebook.com/santarembasket" class="sbc-social-btn" target="_blank" rel="noopener" aria-label="Facebook do Santarém Basket Clube">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z"/></svg>
        </a>
        <!-- Instagram -->
        <a href="https://www.instagram.com/santarem_basket_clube/" class="sbc-social-btn" target="_blank" rel="noopener" aria-label="Instagram do Santarém Basket Clube">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.79-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>
        <!-- YouTube / SBCTV -->
        <a href="https://www.youtube.com/@santarembasketclube" class="sbc-social-btn" target="_blank" rel="noopener" aria-label="YouTube SBCTV">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </a>
      </div>
    </div>

    <!-- Coluna 2: Acesso Rápido -->
    <div class="sbc-footer-col">
      <h4>Acesso Rápido</h4>
      <ul class="sbc-footer-links">
        <li><a href="${r('historia/')}">História do Clube</a></li>
        <li><a href="${r('equipas/')}">Equipas & Treinos</a></li>
        <li><a href="${r('socios/')}">Junta-te a Nós</a></li>
        <li><a href="${r('merchandising/')}">Merchandising & Equipamentos</a></li>
        <li><a href="${r('parceiros/')}">Parceiros & Protocolos</a></li>
        <li><a href="${r('contacto/')}">Contactos & Localização</a></li>
      </ul>
    </div>

    <!-- Coluna 3: Contactos & Pavilhão -->
    <div class="sbc-footer-col">
      <h4>Onde Estamos</h4>
      <div class="sbc-footer-contact-item">
        <svg width="16" height="16" fill="var(--sbc-red)" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        <span>Pavilhão Municipal de Santarém<br>Av. Bernardo Santareno, 2005-177 Santarém</span>
      </div>
      <div class="sbc-footer-contact-item">
        <svg width="16" height="16" fill="var(--sbc-red)" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        <span>santarembasketclube@gmail.com</span>
      </div>
    </div>
  </div>

  <div class="sbc-footer-bottom">
    <div>Santarém Basket Clube © 2026. Todos os direitos reservados.</div>
    <div>Santarém, Portugal</div>
  </div>
</footer>
    `;
  }
}

customElements.define('sbc-footer', SbcFooter);
