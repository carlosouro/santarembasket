/**
 * Santarém Basket Clube - Shared Data Web Components
 * Reusable Custom Elements reading directly from /data/*.json:
 * - <sbc-destaques>
 * - <sbc-treinos>
 * - <sbc-parceiros>
 * - <sbc-palmares>
 */

// 1. Destaques & Avisos (<sbc-destaques>)
class SbcDestaques extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = '<div class="sbc-loading-placeholder">A carregar destaques...</div>';
    const limit = this.getAttribute('limit') ? parseInt(this.getAttribute('limit'), 10) : null;
    
    try {
      const res = await fetch('/data/destaques.json');
      if (!res.ok) throw new Error('Não foi possível carregar os destaques');
      let items = await res.json();
      if (limit) items = items.slice(0, limit);
      this.render(items);
    } catch (err) {
      console.warn('Erro ao carregar /data/destaques.json:', err);
      this.innerHTML = '';
    }
  }

  render(items) {
    if (!items || items.length === 0) {
      this.innerHTML = '';
      return;
    }

    const cardsHtml = items.map(item => `
      <div class="sbc-destaque-card">
        <div class="sbc-destaque-badge">${this.escapeHtml(item.badge || item.categoria || 'Destaque')}</div>
        <h3 class="sbc-destaque-title">${this.escapeHtml(item.titulo)}</h3>
        <p class="sbc-destaque-desc">${this.escapeHtml(item.descricao)}</p>
        <div class="sbc-destaque-action">
          <a href="${this.escapeHtml(item.link)}" class="sbc-destaque-btn" ${item.externo ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            <span>${this.escapeHtml(item.textoBotao || 'Saber Mais')}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </div>
    `).join('');

    this.innerHTML = `<div class="sbc-destaques-grid">${cardsHtml}</div>`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
customElements.define('sbc-destaques', SbcDestaques);

// 2. Horários dos Treinos (<sbc-treinos>)
class SbcTreinos extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = '<div class="sbc-loading-placeholder">A carregar horários dos treinos...</div>';
    const teamSlug = this.getAttribute('team');

    try {
      const res = await fetch('/data/treinos.json');
      if (!res.ok) throw new Error('Não foi possível carregar os treinos');
      const data = await res.json();
      
      if (teamSlug) {
        this.renderTeamSchedule(data, teamSlug);
      } else {
        this.renderConsolidatedTable(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar /data/treinos.json:', err);
      this.innerHTML = '<p class="sbc-error-msg">Não foi possível carregar a tabela de horários de momento.</p>';
    }
  }

  renderTeamSchedule(data, teamSlug) {
    const team = data.find(t => t.slug === teamSlug || t.id === teamSlug);
    if (!team || !team.horarios || team.horarios.length === 0) {
      this.innerHTML = '<p class="sbc-info-note">Horário a definir pela equipa técnica.</p>';
      return;
    }

    const rows = team.horarios.map(h => `
      <div class="sbc-team-training-slot">
        <span class="sbc-slot-day">${this.escapeHtml(h.dia)}</span>
        <span class="sbc-slot-time"><strong>${this.escapeHtml(h.inicio)}</strong> – <strong>${this.escapeHtml(h.fim)}</strong></span>
        <span class="sbc-slot-local">${this.escapeHtml(h.local)}</span>
      </div>
    `).join('');

    this.innerHTML = `
      <div class="sbc-team-schedule-box">
        <h4 class="sbc-team-schedule-title">🏀 Horário Semanal de Treinos</h4>
        <div class="sbc-team-slots-list">${rows}</div>
      </div>
    `;
  }

  renderConsolidatedTable(data) {
    let rowsHtml = '';
    data.forEach(t => {
      const slots = t.horarios.map(h => `
        <span class="sbc-tag-slot">
          <strong>${this.escapeHtml(h.dia)}</strong>: ${this.escapeHtml(h.inicio)}–${this.escapeHtml(h.fim)} <small>(${this.escapeHtml(h.local)})</small>
        </span>
      `).join(' ');

      rowsHtml += `
        <tr data-genero="${this.escapeHtml(t.genero)}" data-slug="${this.escapeHtml(t.slug)}">
          <td class="sbc-cell-team">
            <strong>${this.escapeHtml(t.escalao)}</strong>
            ${t.treinador ? `<div class="sbc-sub-text">Treinador: ${this.escapeHtml(t.treinador)}</div>` : ''}
          </td>
          <td class="sbc-cell-slots">${slots}</td>
        </tr>
      `;
    });

    this.innerHTML = `
      <div class="sbc-table-container">
        <div class="sbc-table-controls">
          <button type="button" class="sbc-filter-btn active" data-filter="all">Todos os Escalões</button>
          <button type="button" class="sbc-filter-btn" data-filter="Masculino">Masculinos</button>
          <button type="button" class="sbc-filter-btn" data-filter="Feminino">Femininos</button>
          <button type="button" class="sbc-filter-btn" data-filter="Misto">Minibasquete</button>
        </div>
        <div class="sbc-table-responsive">
          <table class="sbc-modern-table">
            <thead>
              <tr>
                <th style="width: 32%;">Escalão / Equipa</th>
                <th style="width: 68%;">Dias, Horário & Local</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.setupFilters();
  }

  setupFilters() {
    const buttons = this.querySelectorAll('.sbc-filter-btn');
    const rows = this.querySelectorAll('tbody tr');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');

        rows.forEach(r => {
          if (filter === 'all' || r.getAttribute('data-genero') === filter) {
            r.style.display = '';
          } else {
            r.style.display = 'none';
          }
        });
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
customElements.define('sbc-treinos', SbcTreinos);

// 3. Parceiros, Apoios & Protocolos (<sbc-parceiros>)
class SbcParceiros extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = '<div class="sbc-loading-placeholder">A carregar parceiros...</div>';
    const section = this.getAttribute('section') || 'all';

    try {
      const res = await fetch('/data/parceiros.json');
      if (!res.ok) throw new Error('Não foi possível carregar os parceiros');
      const data = await res.json();
      this.render(data, section);
    } catch (err) {
      console.warn('Erro ao carregar /data/parceiros.json:', err);
      this.innerHTML = '';
    }
  }

  render(data, section) {
    let html = '';

    if (section === 'all' || section === 'institucionais') {
      if (data.institucionais && data.institucionais.length > 0) {
        html += `
          <div class="sbc-partners-block">
            <h3 class="sbc-section-subtitle">Parceiros Institucionais</h3>
            <div class="sbc-partners-grid">
              ${data.institucionais.map(p => `
                <div class="sbc-partner-card">
                  <div class="sbc-partner-logo-box">
                    ${p.logo ? `
                      <img src="${this.escapeHtml(p.logo)}" alt="${this.escapeHtml(p.nome)}" class="sbc-partner-logo-img" loading="lazy">
                    ` : `
                      <div class="sbc-partner-logo-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                      </div>
                    `}
                  </div>
                  <div class="sbc-partner-type">${this.escapeHtml(p.tipo)}</div>
                  <h4 class="sbc-partner-name">${this.escapeHtml(p.nome)}</h4>
                  <p class="sbc-partner-desc">${this.escapeHtml(p.descricao)}</p>
                  ${p.link && p.link !== '#' ? `<a href="${this.escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer" class="sbc-partner-link">Visitar Website ↗</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    if (section === 'all' || section === 'patrocinadores') {
      if (data.patrocinadores && data.patrocinadores.length > 0) {
        html += `
          <div class="sbc-partners-block" style="margin-top: 36px;">
            <h3 class="sbc-section-subtitle">Patrocinadores & Apoios</h3>
            <div class="sbc-partners-grid">
              ${data.patrocinadores.map(p => `
                <div class="sbc-partner-card sbc-card-sponsor">
                  <div class="sbc-partner-logo-box">
                    ${p.logo ? `
                      <img src="${this.escapeHtml(p.logo)}" alt="${this.escapeHtml(p.nome)}" class="sbc-partner-logo-img" loading="lazy">
                    ` : `
                      <div class="sbc-partner-logo-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </div>
                    `}
                  </div>
                  <div class="sbc-partner-type">${this.escapeHtml(p.tipo)}</div>
                  <h4 class="sbc-partner-name">${this.escapeHtml(p.nome)}</h4>
                  <p class="sbc-partner-desc">${this.escapeHtml(p.descricao)}</p>
                  ${p.link && p.link !== '#' ? `<a href="${this.escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer" class="sbc-partner-link">Saber Mais ↗</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    if (section === 'all' || section === 'protocolos') {
      if (data.protocolos && data.protocolos.length > 0) {
        html += `
          <div class="sbc-partners-block" style="margin-top: 32px;">
            <h3 class="sbc-section-subtitle">Protocolos & Benefícios para Sócios e Atletas</h3>
            <div class="sbc-protocols-grid">
              ${data.protocolos.map(pr => `
                <div class="sbc-protocol-card">
                  <span class="sbc-protocol-tag">${this.escapeHtml(pr.categoria)}</span>
                  <h4 class="sbc-protocol-name">${this.escapeHtml(pr.entidade)}</h4>
                  <p class="sbc-protocol-desc">${this.escapeHtml(pr.vantagem)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    this.innerHTML = html;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
customElements.define('sbc-parceiros', SbcParceiros);

// 4. Palmarés & Conquistas (<sbc-palmares>)
class SbcPalmares extends HTMLElement {
  async connectedCallback() {
    const view = this.getAttribute('view') || 'stats';

    try {
      const res = await fetch('/data/palmares.json');
      if (!res.ok) throw new Error('Não foi possível carregar o palmarés');
      const data = await res.json();
      
      if (view === 'stats') {
        this.renderStats(data.estatisticas);
      } else {
        this.renderFull(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar /data/palmares.json:', err);
      this.innerHTML = '';
    }
  }

  renderStats(stats) {
    if (!stats) return;
    this.innerHTML = `
      <div class="sbc-palmares-stats-row">
        <div class="sbc-stat-box">
          <div class="sbc-stat-number">${stats.anosHistoria}+</div>
          <div class="sbc-stat-label">Anos de Formação</div>
        </div>
        <div class="sbc-stat-box">
          <div class="sbc-stat-number">${stats.titulosNacionais}</div>
          <div class="sbc-stat-label">Títulos Nacionais</div>
        </div>
        <div class="sbc-stat-box">
          <div class="sbc-stat-number">${stats.tacasPortugal + stats.supertacas}</div>
          <div class="sbc-stat-label">Taças e Supertaças</div>
        </div>
        <div class="sbc-stat-box">
          <div class="sbc-stat-number">${stats.titulosDistritais}+</div>
          <div class="sbc-stat-label">Conquistas Distritais</div>
        </div>
      </div>
    `;
  }

  renderFull(data) {
    let nacHtml = '';
    if (data.nacionais) {
      data.nacionais.forEach(n => {
        const items = n.conquistas.map(c => `<li><strong>${this.escapeHtml(c.epoca)}</strong>: ${this.escapeHtml(c.classificacao)}</li>`).join('');
        nacHtml += `
          <div class="sbc-palmares-group">
            <h4>${this.escapeHtml(n.escalao)} — ${this.escapeHtml(n.competicao)}</h4>
            <ul class="sbc-palmares-list">${items}</ul>
          </div>
        `;
      });
    }

    let distHtml = '';
    if (data.regionaisDistritais) {
      distHtml = data.regionaisDistritais.map(rd => `
        <div class="sbc-palmares-group">
          <h4>${this.escapeHtml(rd.escalao)}</h4>
          <p class="sbc-palmares-text">${this.escapeHtml(rd.titulos)}</p>
        </div>
      `).join('');
    }

    this.innerHTML = `
      <div class="sbc-palmares-full-wrapper">
        <h3 class="sbc-palmares-headline">Títulos Nacionais</h3>
        ${nacHtml}
        <h3 class="sbc-palmares-headline" style="margin-top: 36px;">Títulos Distritais & Regionais</h3>
        ${distHtml}
      </div>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
customElements.define('sbc-palmares', SbcPalmares);

// 5. Equipas & Plantéis (<sbc-equipas>)
class SbcEquipas extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = '<div class="sbc-loading-placeholder">A carregar equipas e plantéis...</div>';
    const targetTeam = this.getAttribute('team');

    try {
      const res = await fetch('/data/equipas.json');
      if (!res.ok) throw new Error('Não foi possível carregar as equipas');
      const teams = await res.json();
      
      if (targetTeam) {
        const singleTeam = teams.find(t => t.id === targetTeam || t.id.includes(targetTeam));
        if (singleTeam) {
          this.renderSingle(singleTeam);
        } else {
          this.renderAll(teams);
        }
      } else {
        this.renderAll(teams);
      }
    } catch (err) {
      console.warn('Erro ao carregar /data/equipas.json:', err);
      this.innerHTML = '<p style="text-align:center; color: var(--sbc-gray-600); padding: 20px;">Informação de equipas brevemente disponível.</p>';
    }
  }

  renderAll(teams) {
    this.innerHTML = `
      <div class="sbc-teams-wrapper">
        <!-- Filter Tabs -->
        <div class="sbc-teams-filter-bar">
          <button class="sbc-filter-btn active" data-filter="all">Todas as Equipas (${teams.length})</button>
          <button class="sbc-filter-btn" data-filter="Masculino">Masculinos</button>
          <button class="sbc-filter-btn" data-filter="Feminino">Femininos</button>
          <button class="sbc-filter-btn" data-filter="Misto">Minibasquete</button>
        </div>

        <div class="sbc-teams-container">
          ${teams.map(t => this.renderTeamCard(t)).join('')}
        </div>
      </div>
    `;

    // Filter functionality
    const buttons = this.querySelectorAll('.sbc-filter-btn');
    const cards = this.querySelectorAll('.sbc-team-showcase-card');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;

        cards.forEach(card => {
          if (filter === 'all' || card.dataset.gender === filter) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  renderSingle(team) {
    this.innerHTML = `
      <div class="sbc-teams-wrapper">
        ${this.renderTeamCard(team, true)}
      </div>
    `;
  }

  renderTeamCard(team, isOpen = false) {
    const hasRoster = team.plantel && team.plantel.length > 0;

    return `
      <article class="sbc-team-showcase-card" data-gender="${this.escapeHtml(team.genero)}" id="equipa-${this.escapeHtml(team.id)}">
        <header class="sbc-team-card-header">
          <div class="sbc-team-card-title-group">
            <span class="sbc-team-category-badge">${this.escapeHtml(team.categoria || team.escalao)}</span>
            <h3 class="sbc-team-card-title">${this.escapeHtml(team.nome)}</h3>
            <div class="sbc-team-tags">
              ${team.competicoes ? team.competicoes.map(c => `<span class="sbc-tag">${this.escapeHtml(c)}</span>`).join('') : ''}
            </div>
          </div>
          
          ${team.treinador ? `
            <div class="sbc-team-staff-badge">
              ${team.treinadorFoto ? `<img src="${this.escapeHtml(team.treinadorFoto)}" alt="${this.escapeHtml(team.treinador)}" class="sbc-staff-thumb" loading="lazy">` : `
                <div class="sbc-staff-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              `}
              <div class="sbc-staff-info">
                <span class="sbc-staff-role">Treinador(a)</span>
                <span class="sbc-staff-name">${this.escapeHtml(team.treinador)}</span>
              </div>
            </div>
          ` : ''}
        </header>

        ${team.fotoEquipa ? `
          <div class="sbc-team-banner-wrap">
            <img src="${this.escapeHtml(team.fotoEquipa)}" alt="Fotografia Plantel ${this.escapeHtml(team.nome)}" class="sbc-team-banner-img" loading="lazy">
            <div class="sbc-team-banner-overlay">Plantel Oficial Santarém Basket Clube • Época 2026 / 2027</div>
          </div>
        ` : ''}

        <p class="sbc-team-desc">${this.escapeHtml(team.descricao)}</p>

        <div class="sbc-team-meta-bar">
          <div class="sbc-meta-item">
            <span class="sbc-meta-icon">🕒</span>
            <div><strong>Horários:</strong> ${this.escapeHtml(team.treinos)}</div>
          </div>
          <div class="sbc-meta-item">
            <span class="sbc-meta-icon">📍</span>
            <div><strong>Local:</strong> ${this.escapeHtml(team.pavilhao)}</div>
          </div>
        </div>

        ${hasRoster ? `
          <div class="sbc-roster-container">
            <div class="sbc-roster-header">
              <h4 class="sbc-roster-title">
                <span>Plantel de Atletas</span>
                <span class="sbc-badge-count">${team.plantel.length} Jogadores</span>
              </h4>
            </div>

            <div class="sbc-roster-grid">
              ${team.plantel.map(p => `
                <div class="sbc-player-card">
                  <div class="sbc-player-avatar-box">
                    <img src="${this.escapeHtml(p.foto)}" alt="${this.escapeHtml(p.nome)}" class="sbc-player-photo" loading="lazy">
                    <span class="sbc-player-num-tag">#${p.numero}</span>
                  </div>
                  <div class="sbc-player-body">
                    <h5 class="sbc-player-name">${this.escapeHtml(p.nome)}</h5>
                    <span class="sbc-player-pos">${this.escapeHtml(p.posicao)}</span>
                    <div class="sbc-player-specs">
                      ${p.altura ? `<span>${this.escapeHtml(p.altura)}</span>` : ''}
                      ${p.ano ? `<span>Nasc. ${this.escapeHtml(p.ano)}</span>` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="sbc-roster-empty-notice">
            <span>Inscrições abertas e captações em curso para este escalão no Pavilhão Municipal de Santarém.</span>
          </div>
        `}
      </article>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
customElements.define('sbc-equipas', SbcEquipas);

