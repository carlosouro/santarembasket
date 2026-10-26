/**
 * Santarém Basket Clube - Shared Data Web Components
 * Reusable Custom Elements reading from data/*.json via relative path resolution:
 * - <sbc-destaques>
 * - <sbc-treinos>
 * - <sbc-parceiros>
 * - <sbc-palmares>
 * - <sbc-equipas>
 */

function sbcDataResolveUrl(path) {
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

// 1. Destaques & Avisos (<sbc-destaques>)
class SbcDestaques extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = '<div class="sbc-loading-placeholder">A carregar destaques...</div>';
    const limit = this.getAttribute('limit') ? parseInt(this.getAttribute('limit'), 10) : null;
    
    try {
      const res = await fetch(sbcDataResolveUrl('data/destaques.json'));
      if (!res.ok) throw new Error('Não foi possível carregar os destaques');
      let items = await res.json();
      if (limit) items = items.slice(0, limit);
      this.render(items);
    } catch (err) {
      console.warn('Erro ao carregar data/destaques.json:', err);
      this.innerHTML = '';
    }
  }

  render(items) {
    if (!items || items.length === 0) {
      this.innerHTML = '';
      return;
    }

    const cardsHtml = items.map(item => `
      <article class="sbc-destaque-card">
        <div class="sbc-destaque-badge">${this.escapeHtml(item.badge || item.categoria || 'Destaque')}</div>
        <h3 class="sbc-destaque-title">${this.escapeHtml(item.titulo)}</h3>
        <p class="sbc-destaque-desc">${this.escapeHtml(item.descricao)}</p>
        <div class="sbc-destaque-action">
          <a href="${this.escapeHtml(sbcDataResolveUrl(item.link))}" class="sbc-destaque-btn" ${item.externo ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            <span>${this.escapeHtml(item.textoBotao || 'Saber Mais')}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </article>
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
      const res = await fetch(sbcDataResolveUrl('data/equipas.json'));
      if (!res.ok) throw new Error('Não foi possível carregar os horários das equipas');
      const teams = await res.json();

      if (teamSlug) {
        this.renderTeamSchedule(teams, teamSlug);
      } else {
        this.renderWeeklyCalendar(teams);
      }
    } catch (err) {
      console.warn('Erro ao carregar horários em data/equipas.json:', err);
      this.innerHTML = '<p class="sbc-error-msg">Não foi possível carregar o calendário de horários de momento.</p>';
    }
  }

  renderTeamSchedule(teams, teamSlug) {
    let slots = [];
    const directTeam = teams.find(t => t.id === teamSlug || t.slug === teamSlug);

    if (directTeam && Array.isArray(directTeam.horarios)) {
      slots = directTeam.horarios;
    } else if (teamSlug === 'sub12-m' || teamSlug === 'sub12-f') {
      const mini = teams.find(t => t.id === 'minibasquete');
      const targetNota = teamSlug === 'sub12-m' ? 'Sub-12 Masculinos' : 'Sub-12 Femininos';
      if (mini && Array.isArray(mini.horarios)) {
        slots = mini.horarios.filter(h => h.nota === targetNota);
      }
    }

    if (!slots || slots.length === 0) {
      this.innerHTML = '<p class="sbc-info-note">Horário a definir pela equipa técnica.</p>';
      return;
    }

    const pills = slots.map(h => `
      <span class="sbc-tag-slot">
        ${h.nota ? `<span class="sbc-tag-slot-note">${this.escapeHtml(h.nota)}</span> ` : ''}<strong>${this.escapeHtml(h.dia)}</strong>: ${this.escapeHtml(h.inicio)}–${this.escapeHtml(h.fim)} <small>(${this.escapeHtml(h.local)})</small>
      </span>
    `).join(' ');

    this.innerHTML = `
      <div class="sbc-team-schedule-box">
        <h4 class="sbc-team-schedule-title">🕒 Horários dos Treinos</h4>
        <div class="sbc-team-schedule-pills">${pills}</div>
      </div>
    `;
  }

  parseMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = String(timeStr).trim().split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  formatShortVenue(local) {
    const str = String(local || '');
    if (str.toLowerCase().includes('nave')) return 'Nave Desportiva';
    if (str.toLowerCase().includes('pavilhão') || str.toLowerCase().includes('pavilhao')) return 'Pavilhão Municipal';
    return str;
  }

  extractAllSessions(teams) {
    const sessions = [];
    teams.forEach(team => {
      const horarios = Array.isArray(team.horarios) ? team.horarios : [];
      horarios.forEach((h, idx) => {
        const nota = h.nota || '';
        const displayTitle = nota || team.nome || team.escalao;
        let effectiveGender = team.genero || 'Misto';
        if (nota.toLowerCase().includes('masculino')) {
          effectiveGender = 'Masculino';
        } else if (nota.toLowerCase().includes('feminino')) {
          effectiveGender = 'Feminino';
        }
        const isMinibasquete = team.id === 'minibasquete' || (team.genero === 'Misto') || nota.toLowerCase().includes('sub-12') || nota.toLowerCase().includes('minibasquete');
        const groupKey = nota ? `${team.id}-${nota.toLowerCase().replace(/\s+/g, '-')}` : team.id;

        sessions.push({
          uid: `${team.id}-${idx}`,
          teamId: team.id,
          groupKey,
          title: displayTitle,
          treinador: team.treinador || '',
          genero: effectiveGender,
          isMinibasquete,
          colorTheme: (team.id === 'minibasquete' && !nota.toLowerCase().includes('sub-12'))
            ? 'misto'
            : (effectiveGender === 'Feminino' ? 'feminino' : (effectiveGender === 'Masculino' ? 'masculino' : 'misto')),
          dia: h.dia,
          inicio: h.inicio,
          fim: h.fim,
          startMin: this.parseMinutes(h.inicio),
          endMin: this.parseMinutes(h.fim),
          local: h.local || '',
          shortLocal: this.formatShortVenue(h.local)
        });
      });
    });
    return sessions;
  }

  computeDayLanes(daySessions) {
    const sorted = [...daySessions].sort((a, b) => {
      if (a.startMin !== b.startMin) return a.startMin - b.startMin;
      if (a.endMin !== b.endMin) return b.endMin - a.endMin;
      return a.shortLocal.localeCompare(b.shortLocal);
    });

    // Partition into connected overlapping clusters
    const clusters = [];
    let currentCluster = [];
    let clusterMaxEnd = -1;

    sorted.forEach(ev => {
      if (currentCluster.length === 0) {
        currentCluster.push(ev);
        clusterMaxEnd = ev.endMin;
      } else if (ev.startMin < clusterMaxEnd) {
        currentCluster.push(ev);
        if (ev.endMin > clusterMaxEnd) clusterMaxEnd = ev.endMin;
      } else {
        clusters.push(currentCluster);
        currentCluster = [ev];
        clusterMaxEnd = ev.endMin;
      }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);

    const positioned = [];
    clusters.forEach(cluster => {
      const laneEndTimes = [];
      cluster.forEach(ev => {
        let assignedLane = -1;
        for (let i = 0; i < laneEndTimes.length; i++) {
          if (laneEndTimes[i] <= ev.startMin) {
            assignedLane = i;
            laneEndTimes[i] = ev.endMin;
            break;
          }
        }
        if (assignedLane === -1) {
          assignedLane = laneEndTimes.length;
          laneEndTimes.push(ev.endMin);
        }
        ev._lane = assignedLane;
      });

      const totalLanes = laneEndTimes.length;
      cluster.forEach(ev => {
        // Check if this specific event overlaps with any other event in the cluster
        const overlapping = cluster.filter(other =>
          other.uid !== ev.uid && other.startMin < ev.endMin && other.endMin > ev.startMin
        );
        if (overlapping.length === 0) {
          positioned.push({
            ...ev,
            lane: 0,
            span: 1,
            totalLanes: 1
          });
        } else {
          // Expand across adjacent right-hand lanes if those lanes are empty during [ev.startMin, ev.endMin]
          let span = 1;
          for (let nextLane = ev._lane + 1; nextLane < totalLanes; nextLane++) {
            const laneBusy = overlapping.some(other => other._lane === nextLane);
            if (!laneBusy) {
              span++;
            } else {
              break;
            }
          }
          positioned.push({
            ...ev,
            lane: ev._lane,
            span,
            totalLanes
          });
        }
      });
    });

    return positioned;
  }

  renderWeeklyCalendar(teams) {
    this.allSessions = this.extractAllSessions(teams);
    this.activeGenderFilter = 'all';
    this.activeVenueFilter = 'all';
    this.activeMobileDay = 'Segunda-feira';

    const weekdays = [
      { key: 'Segunda-feira', short: '2ª Feira', label: 'Segunda-feira' },
      { key: 'Terça-feira', short: '3ª Feira', label: 'Terça-feira' },
      { key: 'Quarta-feira', short: '4ª Feira', label: 'Quarta-feira' },
      { key: 'Quinta-feira', short: '5ª Feira', label: 'Quinta-feira' },
      { key: 'Sexta-feira', short: '6ª Feira', label: 'Sexta-feira' }
    ];
    this.weekdays = weekdays;

    // 15-minute slots from 18:00 (1080m) to 23:00 (1380m) => 20 slots
    this.calStartMin = 18 * 60;
    this.calEndMin = 23 * 60;
    this.slotStepMin = 15;
    this.totalSlots = (this.calEndMin - this.calStartMin) / this.slotStepMin; // 20

    let timeTicksHtml = '';
    for (let i = 0; i <= this.totalSlots; i++) {
      const mins = this.calStartMin + i * this.slotStepMin;
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      const isFullHour = (mins % 60) === 0;
      const isHalfHour = (mins % 60) === 30;
      const topPct = (i / this.totalSlots) * 100;

      timeTicksHtml += `
        <div class="sbc-cal-time-label ${isFullHour ? 'is-hour' : (isHalfHour ? 'is-half' : 'is-quarter')}" style="top: ${topPct}%;">
          <span>${hh}:${mm}</span>
        </div>
      `;
    }

    let gridLinesHtml = '';
    for (let i = 0; i <= this.totalSlots; i++) {
      const mins = this.calStartMin + i * this.slotStepMin;
      const isFullHour = (mins % 60) === 0;
      const isHalfHour = (mins % 60) === 30;
      const topPct = (i / this.totalSlots) * 100;
      gridLinesHtml += `<div class="sbc-cal-grid-line ${isFullHour ? 'is-hour' : (isHalfHour ? 'is-half' : 'is-quarter')}" style="top: ${topPct}%;"></div>`;
    }
    this.gridLinesHtml = gridLinesHtml;

    this.innerHTML = `
      <div class="sbc-cal-wrapper">
        <!-- Control Bar: Filters & Legend -->
        <div class="sbc-cal-toolbar">
          <div class="sbc-cal-filter-group" role="group" aria-label="Filtrar por Escalão">
            <span class="sbc-cal-filter-label">Escalão:</span>
            <button type="button" class="sbc-filter-btn active" data-gender-filter="all">Todos os Escalões</button>
            <button type="button" class="sbc-filter-btn" data-gender-filter="Masculino">Masculinos</button>
            <button type="button" class="sbc-filter-btn" data-gender-filter="Feminino">Femininos</button>
            <button type="button" class="sbc-filter-btn" data-gender-filter="Minibasquete">Minibasquete</button>
          </div>

          <div class="sbc-cal-filter-group" role="group" aria-label="Filtrar por Pavilhão">
            <span class="sbc-cal-filter-label">Local:</span>
            <button type="button" class="sbc-filter-btn active" data-venue-filter="all">Todos os Locais</button>
            <button type="button" class="sbc-filter-btn" data-venue-filter="Pavilhão Municipal">📍 Pavilhão Municipal</button>
            <button type="button" class="sbc-filter-btn" data-venue-filter="Nave Desportiva">📍 Nave Desportiva</button>
          </div>
        </div>

        <div class="sbc-cal-legend-bar">
          <div class="sbc-cal-legend-items">
            <span class="sbc-cal-legend-item"><i class="sbc-cal-dot is-masculino"></i> Escalões Masculinos</span>
            <span class="sbc-cal-legend-item"><i class="sbc-cal-dot is-feminino"></i> Escalões Femininos</span>
            <span class="sbc-cal-legend-item"><i class="sbc-cal-dot is-misto"></i> Minibasquete (Sub-8/10)</span>
          </div>
          <div class="sbc-cal-scale-note">Escala rigorosa em blocos de 15 min (18:00 – 23:00)</div>
        </div>

        <!-- Mobile Day Tabs (< 768px) -->
        <div class="sbc-cal-mobile-days" role="tablist" aria-label="Selecionar Dia da Semana">
          ${weekdays.map((d, idx) => `
            <button type="button" role="tab" class="sbc-cal-day-tab ${idx === 0 ? 'active' : ''}" data-day-tab="${d.key}" aria-selected="${idx === 0 ? 'true' : 'false'}">
              ${d.short}
            </button>
          `).join('')}
        </div>

        <!-- Main Weekly Calendar Grid -->
        <div class="sbc-cal-scroll-container">
          <div class="sbc-cal-board">
            <!-- Sticky Header Row -->
            <div class="sbc-cal-header-row">
              <div class="sbc-cal-corner-cell">Hora</div>
              ${weekdays.map(d => `
                <div class="sbc-cal-day-header ${d.key === this.activeMobileDay ? 'is-mobile-active' : ''}" data-day-col="${d.key}">
                  <span class="sbc-cal-day-full">${d.label}</span>
                  <span class="sbc-cal-day-short">${d.short}</span>
                </div>
              `).join('')}
            </div>

            <!-- Body: Time Axis + 5 Day Columns -->
            <div class="sbc-cal-body">
              <div class="sbc-cal-time-axis" aria-hidden="true">
                ${timeTicksHtml}
              </div>
              <div class="sbc-cal-days-columns" id="sbc-cal-days-columns">
                <!-- Populated by updateCalendarGrid() -->
              </div>
            </div>
          </div>
        </div>

        <!-- Conditional Weekend Strip (Sábado / Domingo) -->
        <div id="sbc-cal-weekend-container"></div>
      </div>
    `;

    this.updateCalendarGrid();
    this.setupCalendarInteractions();
  }

  getFilteredSessions() {
    return this.allSessions.filter(ev => {
      const genderMatch =
        this.activeGenderFilter === 'all' ||
        (this.activeGenderFilter === 'Minibasquete' && ev.isMinibasquete) ||
        (this.activeGenderFilter === 'Masculino' && ev.genero === 'Masculino') ||
        (this.activeGenderFilter === 'Feminino' && ev.genero === 'Feminino');

      const venueMatch =
        this.activeVenueFilter === 'all' ||
        ev.shortLocal === this.activeVenueFilter;

      return genderMatch && venueMatch;
    });
  }

  updateCalendarGrid() {
    const filtered = this.getFilteredSessions();
    const columnsContainer = this.querySelector('#sbc-cal-days-columns');
    const weekendContainer = this.querySelector('#sbc-cal-weekend-container');
    if (!columnsContainer) return;

    const totalRangeMin = this.calEndMin - this.calStartMin;
    const isOnEquipasPage = window.location.pathname.includes('/equipas');

    const colsHtml = this.weekdays.map(dayObj => {
      const dayEvents = filtered.filter(ev => ev.dia === dayObj.key);
      const positioned = this.computeDayLanes(dayEvents);

      const eventsHtml = positioned.map(ev => {
        const clampedStart = Math.max(this.calStartMin, Math.min(this.calEndMin, ev.startMin));
        const clampedEnd = Math.max(clampedStart + 15, Math.min(this.calEndMin, ev.endMin));
        const topPct = ((clampedStart - this.calStartMin) / totalRangeMin) * 100;
        const heightPct = ((clampedEnd - clampedStart) / totalRangeMin) * 100;
        const span = ev.span || 1;
        const singleLanePct = 100 / ev.totalLanes;
        const widthPct = singleLanePct * span;
        const leftPct = ev.lane * singleLanePct;
        const targetHref = isOnEquipasPage
          ? `#equipa-${this.escapeHtml(ev.teamId)}`
          : `${sbcDataResolveUrl('equipas/')}#equipa-${this.escapeHtml(ev.teamId)}`;
        const venueBadgeClass = ev.shortLocal.includes('Nave') ? 'is-nave' : 'is-pavilhao';
        const effectiveLanes = ev.totalLanes / span;
        const isCompactLane = effectiveLanes >= 2.5;
        const displayVenue = isCompactLane
          ? (ev.shortLocal.includes('Nave') ? 'Nave' : 'Pav. Mun.')
          : (effectiveLanes >= 1.8
              ? (ev.shortLocal.includes('Nave') ? 'Nave Desp.' : 'Pav. Mun.')
              : ev.shortLocal);

        return `
          <a
            href="${targetHref}"
            class="sbc-cal-event theme-${ev.colorTheme} ${isCompactLane ? 'is-compact-lane' : ''}"
            data-group-key="${this.escapeHtml(ev.groupKey)}"
            style="top: calc(${topPct}% + 2px); height: calc(${heightPct}% - 4px); left: calc(${leftPct}% + 2px); width: calc(${widthPct}% - 4px);"
            title="${this.escapeHtml(ev.title)} • ${this.escapeHtml(ev.dia)} (${this.escapeHtml(ev.inicio)}–${this.escapeHtml(ev.fim)}) • ${this.escapeHtml(ev.local)}"
          >
            <div class="sbc-cal-event-time">${this.escapeHtml(ev.inicio)}–${this.escapeHtml(ev.fim)}</div>
            <div class="sbc-cal-event-title">${this.escapeHtml(ev.title)}</div>
            <div class="sbc-cal-event-venue ${venueBadgeClass}">
              <span aria-hidden="true">📍</span> ${this.escapeHtml(displayVenue)}
            </div>
          </a>
        `;
      }).join('');

      const emptyDayHtml = positioned.length === 0
        ? `<div class="sbc-cal-empty-day">Sem treinos para o filtro selecionado</div>`
        : '';

      return `
        <div class="sbc-cal-day-col ${dayObj.key === this.activeMobileDay ? 'is-mobile-active' : ''}" data-day-col="${dayObj.key}">
          ${this.gridLinesHtml}
          ${eventsHtml}
          ${emptyDayHtml}
        </div>
      `;
    }).join('');

    columnsContainer.innerHTML = colsHtml;

    // Conditional Weekend Strip (only rendered if Sábado or Domingo sessions exist)
    if (weekendContainer) {
      const weekendEvents = filtered.filter(ev => ev.dia === 'Sábado' || ev.dia === 'Domingo');
      if (weekendEvents.length > 0) {
        const weekendPills = weekendEvents.map(ev => `
          <span class="sbc-tag-slot">
            <strong>${this.escapeHtml(ev.dia)}</strong> • ${this.escapeHtml(ev.title)}: ${this.escapeHtml(ev.inicio)}–${this.escapeHtml(ev.fim)} <small>(${this.escapeHtml(ev.local)})</small>
          </span>
        `).join(' ');

        weekendContainer.innerHTML = `
          <div class="sbc-cal-weekend-strip">
            <div class="sbc-cal-weekend-title">
              <span aria-hidden="true">📅</span>
              <strong>Treinos de Fim de Semana (Sábado / Domingo)</strong>
            </div>
            <div class="sbc-cal-weekend-list">${weekendPills}</div>
          </div>
        `;
      } else {
        weekendContainer.innerHTML = '';
      }
    }

    this.bindEventHoverHighlight();
  }

  bindEventHoverHighlight() {
    const cards = this.querySelectorAll('.sbc-cal-event');
    const board = this.querySelector('.sbc-cal-board');
    if (!board) return;

    cards.forEach(card => {
      const groupKey = card.getAttribute('data-group-key');
      const activate = () => {
        board.classList.add('has-hover-focus');
        cards.forEach(c => {
          if (c.getAttribute('data-group-key') === groupKey) {
            c.classList.add('is-group-highlighted');
          } else {
            c.classList.remove('is-group-highlighted');
          }
        });
      };
      const deactivate = () => {
        board.classList.remove('has-hover-focus');
        cards.forEach(c => c.classList.remove('is-group-highlighted'));
      };
      card.addEventListener('mouseenter', activate);
      card.addEventListener('mouseleave', deactivate);
      card.addEventListener('focus', activate);
      card.addEventListener('blur', deactivate);
    });
  }

  setupCalendarInteractions() {
    const genderBtns = this.querySelectorAll('[data-gender-filter]');
    genderBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        genderBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeGenderFilter = btn.getAttribute('data-gender-filter');
        this.updateCalendarGrid();
      });
    });

    const venueBtns = this.querySelectorAll('[data-venue-filter]');
    venueBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        venueBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeVenueFilter = btn.getAttribute('data-venue-filter');
        this.updateCalendarGrid();
      });
    });

    const dayTabs = this.querySelectorAll('[data-day-tab]');
    dayTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const selectedDay = tab.getAttribute('data-day-tab');
        this.activeMobileDay = selectedDay;
        dayTabs.forEach(t => {
          const active = t.getAttribute('data-day-tab') === selectedDay;
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        this.querySelectorAll('[data-day-col]').forEach(col => {
          col.classList.toggle('is-mobile-active', col.getAttribute('data-day-col') === selectedDay);
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
      const res = await fetch(sbcDataResolveUrl('data/parceiros.json'));
      if (!res.ok) throw new Error('Não foi possível carregar os parceiros');
      const data = await res.json();
      this.render(data, section);
    } catch (err) {
      console.warn('Erro ao carregar data/parceiros.json:', err);
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
                      <img src="${this.escapeHtml(sbcDataResolveUrl(p.logo))}" alt="${this.escapeHtml(p.nome)}" class="sbc-partner-logo-img" loading="lazy">
                    ` : `
                      <div class="sbc-partner-logo-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                      </div>
                    `}
                  </div>
                  <div class="sbc-partner-type">${this.escapeHtml(p.tipo)}</div>
                  <h4 class="sbc-partner-name">${this.escapeHtml(p.nome)}</h4>
                  <p class="sbc-partner-desc">${this.escapeHtml(p.descricao)}</p>
                  ${p.link && p.link !== '#' ? `<a href="${this.escapeHtml(sbcDataResolveUrl(p.link))}" target="_blank" rel="noopener noreferrer" class="sbc-partner-link">Visitar Website ↗</a>` : ''}
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
                      <img src="${this.escapeHtml(sbcDataResolveUrl(p.logo))}" alt="${this.escapeHtml(p.nome)}" class="sbc-partner-logo-img" loading="lazy">
                    ` : `
                      <div class="sbc-partner-logo-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </div>
                    `}
                  </div>
                  <div class="sbc-partner-type">${this.escapeHtml(p.tipo)}</div>
                  <h4 class="sbc-partner-name">${this.escapeHtml(p.nome)}</h4>
                  <p class="sbc-partner-desc">${this.escapeHtml(p.descricao)}</p>
                  ${p.link && p.link !== '#' ? `<a href="${this.escapeHtml(sbcDataResolveUrl(p.link))}" target="_blank" rel="noopener noreferrer" class="sbc-partner-link">Saber Mais ↗</a>` : ''}
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
      const res = await fetch(sbcDataResolveUrl('data/palmares.json'));
      if (!res.ok) throw new Error('Não foi possível carregar o palmarés');
      const data = await res.json();
      
      if (view === 'stats') {
        this.renderStats(data.estatisticas);
      } else {
        this.renderFull(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar data/palmares.json:', err);
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
      const res = await fetch(sbcDataResolveUrl('data/equipas.json'));
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
      console.warn('Erro ao carregar data/equipas.json:', err);
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
              ${team.treinadorFoto ? `<img src="${this.escapeHtml(sbcDataResolveUrl(team.treinadorFoto))}" alt="${this.escapeHtml(team.treinador)}" class="sbc-staff-thumb" loading="lazy">` : `
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
            <img src="${this.escapeHtml(sbcDataResolveUrl(team.fotoEquipa))}" alt="Fotografia Plantel ${this.escapeHtml(team.nome)}" class="sbc-team-banner-img" loading="lazy">
            <div class="sbc-team-banner-overlay">Plantel Oficial Santarém Basket Clube • Época 2026 / 2027</div>
          </div>
        ` : ''}

        <p class="sbc-team-desc">${this.escapeHtml(team.descricao)}</p>

        ${team.horarios && team.horarios.length > 0 ? `
          <div class="sbc-team-schedule-inline">
            <div class="sbc-team-schedule-label">
              <span class="sbc-meta-icon">🕒</span>
              <strong>Horários dos Treinos</strong>
            </div>
            <div class="sbc-team-schedule-pills">
              ${team.horarios.map(h => `
                <span class="sbc-tag-slot">
                  ${h.nota ? `<span class="sbc-tag-slot-note">${this.escapeHtml(h.nota)}</span>` : ''}
                  <strong>${this.escapeHtml(h.dia)}:</strong> ${this.escapeHtml(h.inicio)}–${this.escapeHtml(h.fim)}
                  <small>(${this.escapeHtml(h.local)})</small>
                </span>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="sbc-team-meta-bar">
            <div class="sbc-meta-item">
              <span class="sbc-meta-icon">🕒</span>
              <div><strong>Horários dos Treinos:</strong> ${this.escapeHtml(team.treinos)}</div>
            </div>
            <div class="sbc-meta-item">
              <span class="sbc-meta-icon">📍</span>
              <div><strong>Local:</strong> ${this.escapeHtml(team.pavilhao)}</div>
            </div>
          </div>
        `}

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
                    <img src="${this.escapeHtml(sbcDataResolveUrl(p.foto))}" alt="${this.escapeHtml(p.nome)}" class="sbc-player-photo" loading="lazy">
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
