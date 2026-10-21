/**
 * ContentRenderer Module
 * Renders subject summaries, e-book reader controls, rich callouts, table of contents, and bookmarks
 */
const ContentRenderer = {
  currentSubjectId: "01",
  currentPageNum: 1,
  currentSubjectData: null,
  searchQuery: "",
  keyListenerAttached: false,

  async init(container, subjectId = "01", pageNum = 1) {
    this.currentSubjectId = subjectId;
    this.currentPageNum = parseInt(pageNum, 10) || 1;
    this.container = container;
    this.setupKeyboardNavigation();
    await this.render();
  },

  setupKeyboardNavigation() {
    if (this.keyListenerAttached) return;
    this.keyListenerAttached = true;

    window.addEventListener("keydown", (e) => {
      // Ignore if user is currently typing in an input, textarea, or select
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      // Check if we are currently viewing the content page
      const hash = window.location.hash || "";
      if (!hash.startsWith("#content")) return;

      if (e.key === "ArrowLeft") {
        ContentRenderer.prevPage();
      } else if (e.key === "ArrowRight") {
        ContentRenderer.nextPage();
      } else if (e.key === "Escape") {
        ContentRenderer.closeTOC();
      }
    });
  },

  async render() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <p style="margin-top: 1rem;">กำลังโหลดเนื้อหาอีบุ๊ค...</p>
      </div>
    `;

    try {
      this.currentSubjectData = await DataLoader.loadContentSubject(this.currentSubjectId);
      ProgressStore.setLastRead(this.currentSubjectId, this.currentPageNum);
      this.renderView();
    } catch (err) {
      this.container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <div class="empty-state-title">ไม่สามารถโหลดเนื้อหาได้</div>
          <div class="empty-state-desc">${Utils.escapeHtml(err.message)}</div>
          <button class="btn btn-primary" onclick="ContentRenderer.render()">ลองใหม่อีกครั้ง</button>
        </div>
      `;
    }
  },

  renderView() {
    const data = this.currentSubjectData;
    const totalPages = data.total_pages || (data.pages ? data.pages.length : 1);
    const pageIndex = Math.max(1, Math.min(this.currentPageNum, totalPages));
    this.currentPageNum = pageIndex;
    
    const pageData = data.pages.find(p => p.page_number === pageIndex) || data.pages[pageIndex - 1] || {
      title: "",
      chapter_num: 1,
      chapter_title: "",
      reading_time_min: 2,
      content: "",
      lines: [],
      callouts: [],
      key_takeaways: []
    };

    const isBookmarked = ProgressStore.isBookmarked(this.currentSubjectId, pageIndex);
    const manifest = DataLoader.manifest;
    const subjectList = manifest ? manifest.content_modules : [];

    let subjectOptions = subjectList.map(s => `
      <option value="${s.id}" ${s.id === this.currentSubjectId ? 'selected' : ''}>
        ${s.id}. ${Utils.escapeHtml(s.title)} (${s.pages_count} หน้า)
      </option>
    `).join("");

    // Quick page jump options
    let pageSelectOptions = "";
    for (let i = 1; i <= totalPages; i++) {
      const pObj = data.pages[i - 1];
      let pTitle = "";
      if (pObj && pObj.title) {
        const cleanT = pObj.title.trim();
        pTitle = cleanT.length > 20 ? ` (${cleanT.slice(0, 20)}...)` : ` (${cleanT})`;
      }
      pageSelectOptions += `<option value="${i}" ${i === pageIndex ? 'selected' : ''}>หน้า ${i}${pTitle}</option>`;
    }

    // Filter and format text lines
    let formattedLines = (pageData.lines || []).map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      // Skip lines that duplicate callout blocks in plain text
      if (trimmed.startsWith("[💡") || trimmed.startsWith("[📐") || trimmed.startsWith("[📜") || trimmed.startsWith("[⚠️") || trimmed.startsWith("> ")) {
        return "";
      }
      if (trimmed.startsWith("สรุปประเด็นจำแม่น:") || trimmed.startsWith("✓ ")) {
        return "";
      }

      let lineHtml = Utils.escapeHtml(trimmed);

      // Highlight search query if active
      if (this.searchQuery) {
        const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, "gi");
        lineHtml = lineHtml.replace(regex, '<mark style="background-color: #FEF08A; padding: 0 2px; border-radius: 2px;">$1</mark>');
      }

      // Check if heading or section
      if (/^(บทที่|ตอนที่|สรุป|หมวดที่|\d+\.|\([0-9]+\))\s/.test(trimmed) || (trimmed.length < 40 && trimmed.endsWith(":"))) {
        return `<div class="reader-line heading">${MathRenderer.formatMathString(lineHtml)}</div>`;
      }

      if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
        return `<div class="reader-line bullet">${MathRenderer.formatMathString(lineHtml)}</div>`;
      }

      return `<div class="reader-line">${MathRenderer.formatMathString(lineHtml)}</div>`;
    }).filter(Boolean).join("");

    // Render Callouts
    let calloutsHtml = "";
    if (pageData.callouts && pageData.callouts.length > 0) {
      calloutsHtml = pageData.callouts.map(c => {
        const cType = c.type || "tip";
        let cSvg = Icons.lightbulb ? Icons.lightbulb() : Icons.book();
        let defaultTitle = "เทคนิคพิชิตข้อสอบ";
        if (cType === "formula") {
          cSvg = Icons.formula ? Icons.formula() : Icons.sliders();
          defaultTitle = "สูตรและแบบจำลองสำคัญ";
        } else if (cType === "rule") {
          cSvg = Icons.fileText ? Icons.fileText() : Icons.book();
          defaultTitle = "หลักเกณฑ์และกฎหมาย";
        } else if (cType === "warning") {
          cSvg = Icons.alertTriangle ? Icons.alertTriangle() : Icons.info();
          defaultTitle = "จุดควรระวังที่มักผิดบ่อย";
        }

        // Clean out any legacy emojis in custom titles
        const cleanTitle = c.title ? c.title.replace(/^\[?[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, '').replace(/\]$/, '').trim() : defaultTitle;
        const titleText = Utils.escapeHtml(cleanTitle || defaultTitle);

        return `
          <div class="callout-box ${cType}">
            <div class="callout-header">${cSvg} <span>${titleText}</span></div>
            <div class="callout-content">${MathRenderer.formatMathString(Utils.escapeHtml(c.content))}</div>
          </div>
        `;
      }).join("");
    }

    // Render Key Takeaways
    let takeawaysHtml = "";
    if (pageData.key_takeaways && pageData.key_takeaways.length > 0) {
      const items = pageData.key_takeaways.map(t => `
        <li class="takeaway-item">
          ${Icons.check()}
          <span>${MathRenderer.formatMathString(Utils.escapeHtml(t))}</span>
        </li>
      `).join("");

      takeawaysHtml = `
        <div class="key-takeaways-card">
          <div class="key-takeaways-header">
            ${Icons.target ? Icons.target() : Icons.checkSquare()}
            <span>สรุปสาระสำคัญประจำบท (Key Takeaways)</span>
          </div>
          <ul class="takeaway-list">
            ${items}
          </ul>
        </div>
      `;
    }

    const progressPercent = Math.round((pageIndex / totalPages) * 100);
    const currentTheme = document.documentElement.getAttribute("data-theme") || (typeof ProgressStore !== "undefined" && ProgressStore.getSettings ? ProgressStore.getSettings().theme : "light") || "light";

    this.container.innerHTML = `
      <div class="reader-container ebook-reader-wrapper">
        <!-- Reading Progress Bar -->
        <div class="reading-progress-track" title="อ่านแล้ว ${progressPercent}%">
          <div class="reading-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>

        <!-- Top E-Book Toolbar -->
        <div class="content-toolbar">
          <div class="content-toolbar-subject">
            <select id="content-subject-select" class="input-text" style="padding-left: 0.75rem; width: 100%;" onchange="ContentRenderer.changeSubject(this.value)">
              ${subjectOptions}
            </select>
          </div>

          <!-- Quick Controls: TOC, Font, Theme -->
          <div class="reader-quick-actions">
            <button class="btn btn-secondary btn-sm" onclick="ContentRenderer.openTOC()" title="เปิดสารบัญประจำเล่ม">
              ${Icons.list()} <span>สารบัญ</span>
            </button>

            <!-- Font Adjuster -->
            <div class="btn-group" style="display: flex; gap: 2px;">
              <button class="btn btn-secondary btn-icon-sm" onclick="ContentRenderer.adjustFontSize(-1)" title="ลดขนาดตัวอักษร">
                A-
              </button>
              <button class="btn btn-secondary btn-icon-sm" onclick="ContentRenderer.adjustFontSize(1)" title="เพิ่มขนาดตัวอักษร">
                A+
              </button>
            </div>

            <!-- Reading Theme Mode (Segmented 3-button bar with text, no emojis) -->
            <div class="radio-pill-group reader-theme-pill-group" style="margin: 0;">
              <button class="radio-pill-btn ${currentTheme === 'light' ? 'active' : ''}" onclick="ContentRenderer.toggleTheme('light')" title="โหมดสว่าง">
                สว่าง
              </button>
              <button class="radio-pill-btn ${currentTheme === 'sepia' ? 'active' : ''}" onclick="ContentRenderer.toggleTheme('sepia')" title="โหมดถนอมสายตา (Sepia)">
                ถนอมสายตา
              </button>
              <button class="radio-pill-btn ${currentTheme === 'dark' ? 'active' : ''}" onclick="ContentRenderer.toggleTheme('dark')" title="โหมดมืด">
                มืด
              </button>
            </div>

            <!-- Bookmark Button -->
            <button class="btn btn-secondary btn-icon-sm" title="${isBookmarked ? 'ลบคั่นหน้านี้' : 'คั่นหน้านี้'}" onclick="ContentRenderer.toggleBookmark()">
              ${Icons.bookmark("", isBookmarked)}
            </button>

            ${data.linked_pdf ? `
              <a href="#pdf?file=${encodeURIComponent(data.linked_pdf)}" class="btn btn-secondary btn-sm" title="เปิด PDF ต้นฉบับ">
                ${Icons.pdf()} <span>PDF</span>
              </a>
            ` : ''}
          </div>
        </div>

        <!-- Page Navigator Bar -->
        <div class="page-navigator-bar">
          <div class="page-controls">
            <button class="btn btn-secondary btn-icon" title="หน้าก่อนหน้า (หรือกด ←)" onclick="ContentRenderer.prevPage()" ${pageIndex <= 1 ? 'disabled' : ''}>
              ${Icons.chevronLeft()}
            </button>
            <select class="input-text reader-page-select" onchange="ContentRenderer.goToPage(this.value)">
              ${pageSelectOptions}
            </select>
            <button class="btn btn-secondary btn-icon" title="หน้าถัดไป (หรือกด →)" onclick="ContentRenderer.nextPage()" ${pageIndex >= totalPages ? 'disabled' : ''}>
              ${Icons.chevronRight()}
            </button>
          </div>

          <!-- Search in E-Book -->
          <div class="reader-search-box">
            <div class="search-wrapper">
              <span class="search-icon">${Icons.search()}</span>
              <input type="text" class="search-input" placeholder="ค้นหาเนื้อหา..." value="${Utils.escapeHtml(this.searchQuery)}" oninput="ContentRenderer.handleSearch(this.value)">
            </div>
          </div>
        </div>

        <!-- Reader Page Card -->
        <article class="content-reader-card" id="reader-article">
          <!-- E-Book Metadata Header -->
          <div class="reader-book-meta">
            <div class="reader-book-title">${Utils.escapeHtml(data.ebook_title || data.title)}</div>
            ${pageData.chapter_title ? `
              <div class="reader-chapter-title">
                <span class="badge badge-accent">บทที่ ${pageData.chapter_num || 1}</span>
                <span>${Utils.escapeHtml(pageData.chapter_title)}</span>
              </div>
            ` : ''}
          </div>

          <header class="reader-header">
            <div class="reader-page-heading">
              ${Utils.escapeHtml(pageData.title || `หน้า ${pageIndex}`)}
            </div>
            <div class="reader-meta-badges">
              <span class="badge badge-subtle" title="เวลาในการอ่านโดยประมาณ">
                ${Icons.clock()} ${pageData.reading_time_min || 2} นาที
              </span>
              <span class="badge badge-default">หน้า ${pageIndex} / ${totalPages}</span>
            </div>
          </header>

          <div class="reader-body">
            ${formattedLines || '<p style="color: var(--text-tertiary); text-align: center;">ไม่มีเนื้อหาในหน้านี้</p>'}
            ${calloutsHtml}
            ${takeawaysHtml}
          </div>
        </article>

        <!-- Bottom Page Controls -->
        <div class="reader-bottom-nav">
          <button class="btn btn-secondary" onclick="ContentRenderer.prevPage()" ${pageIndex <= 1 ? 'disabled' : ''}>
            ${Icons.chevronLeft()} <span>หน้าก่อนหน้า</span>
          </button>
          <span class="reader-bottom-page-info">หน้า ${pageIndex} จาก ${totalPages} (${progressPercent}%)</span>
          <button class="btn btn-primary" onclick="ContentRenderer.nextPage()" ${pageIndex >= totalPages ? 'disabled' : ''}>
            <span>หน้าถัดไป</span> ${Icons.chevronRight()}
          </button>
        </div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: var(--space-3); font-size: 11px; color: var(--text-tertiary);">
          ${Icons.lightbulb ? Icons.lightbulb() : ""}
          <span>เคล็ดลับ: คุณสามารถกดปุ่มลูกศร ← หรือ → บนแป้นพิมพ์เพื่อเปลี่ยนหน้าได้อย่างรวดเร็ว</span>
        </div>
      </div>

      <!-- TOC Modal Container (Rendered on demand) -->
      <div id="toc-modal-anchor"></div>
    `;

    // Trigger Math rendering
    const article = document.getElementById("reader-article");
    if (article) {
      MathRenderer.renderElement(article);
    }
  },

  openTOC() {
    const data = this.currentSubjectData;
    if (!data) return;

    const anchor = document.getElementById("toc-modal-anchor");
    if (!anchor) return;

    const tocList = data.table_of_contents || [];
    const tocItems = tocList.map(item => `
      <div class="toc-item ${this.currentPageNum === item.page_start ? 'active' : ''}" onclick="ContentRenderer.goToPage(${item.page_start}); ContentRenderer.closeTOC();">
        <div>
          <div class="toc-item-title">บทที่ ${item.chapter_num}: ${Utils.escapeHtml(item.title)}</div>
          <div class="toc-item-desc">${Utils.escapeHtml(item.description || "")}</div>
        </div>
        <div class="toc-item-page">หน้า ${item.page_start} →</div>
      </div>
    `).join("");

    anchor.innerHTML = `
      <div class="toc-modal-overlay" onclick="ContentRenderer.handleOverlayClick(event)">
        <div class="toc-modal" onclick="event.stopPropagation()">
          <div class="toc-header">
            <div>
              <div class="toc-title">${Utils.escapeHtml(data.ebook_title || data.title)}</div>
              <div style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-top: 2px;">
                สารบัญทั้งหมด ${data.total_chapters || tocList.length} บท (${data.total_pages} หน้า)
              </div>
            </div>
            <button class="btn btn-ghost btn-icon-sm" onclick="ContentRenderer.closeTOC()">
              ${Icons.close()}
            </button>
          </div>
          <div class="toc-list">
            ${tocItems || '<p style="text-align: center; color: var(--text-tertiary);">ไม่มีสารบัญ</p>'}
          </div>
        </div>
      </div>
    `;
  },

  closeTOC() {
    const anchor = document.getElementById("toc-modal-anchor");
    if (anchor) anchor.innerHTML = "";
  },

  handleOverlayClick(event) {
    if (event.target.classList.contains("toc-modal-overlay")) {
      this.closeTOC();
    }
  },

  toggleTheme(theme) {
    if (typeof UI !== "undefined" && UI.setTheme) {
      UI.setTheme(theme);
    }
    // Update active class on segmented theme pill buttons
    document.querySelectorAll(".reader-theme-pill-group .radio-pill-btn").forEach(btn => {
      btn.classList.remove("active");
    });
    const activeBtn = document.querySelector(`.reader-theme-pill-group .radio-pill-btn[onclick*="'${theme}'"]`);
    if (activeBtn) activeBtn.classList.add("active");
  },

  adjustFontSize(direction) {
    const sizes = ["small", "normal", "large", "xlarge"];
    const current = document.documentElement.getAttribute("data-font-size") || "normal";
    let idx = sizes.indexOf(current);
    if (idx === -1) idx = 1;

    let nextIdx = idx + direction;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= sizes.length) nextIdx = sizes.length - 1;

    const nextSize = sizes[nextIdx];
    if (typeof UI !== "undefined" && UI.setFontSize) {
      UI.setFontSize(nextSize);
    }
  },

  escapeRegex(string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
  },

  handleSearch: Utils.debounce(function(query) {
    ContentRenderer.searchQuery = query.trim();
    ContentRenderer.renderView();
  }, 250),

  changeSubject(subjectId) {
    this.currentSubjectId = subjectId;
    this.currentPageNum = 1;
    this.searchQuery = "";
    this.render();
  },

  goToPage(pageNum) {
    const p = parseInt(pageNum, 10) || 1;
    if (this.currentSubjectData && p >= 1 && p <= this.currentSubjectData.total_pages) {
      this.currentPageNum = p;
      this.renderView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  prevPage() {
    if (this.currentPageNum > 1) {
      this.currentPageNum--;
      this.renderView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  nextPage() {
    if (this.currentSubjectData && this.currentPageNum < this.currentSubjectData.total_pages) {
      this.currentPageNum++;
      this.renderView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  toggleBookmark() {
    const isNow = ProgressStore.toggleBookmark(
      this.currentSubjectId,
      this.currentSubjectData.title,
      this.currentPageNum
    );
    Utils.showToast(isNow ? "บันทึกที่คั่นหน้าเรียบร้อย" : "ลบที่คั่นหน้าแล้ว", isNow ? "info" : "default");
    this.renderView();
  }
};

if (typeof window !== "undefined") {
  window.ContentRenderer = ContentRenderer;
}
