/**
 * OxfordEngine Module
 * Oxford 3000 Flashcard Studio & Vocabulary Bank
 * - 3D Flip Flashcards with zero spoilers on front face
 * - Dual-view workspace: Flashcard mode & Vocabulary Bank mode
 * - Partitioned CEFR level loading (A1, A2, B1, B2, ALL) for instant responsiveness
 * - Clean, professional UI with crisp SVG stroke icons (no casual emojis)
 * - Web Speech API engine with customizable voice and playback rate (0.75x, 1.0x, 1.25x)
 * - Keyboard shortcuts: Space (flip), Arrows (prev/next), 1 (review), 2 (mastered)
 * - Persistent Mastery & Review tracking in ProgressStore
 * - Deep dive accordion: US/UK IPA, Word Forms, Examples, Collocations, Grammar Notes
 */
const OxfordEngine = {
  container: null,
  currentTab: "flashcard", // "flashcard" | "vault"
  currentLevel: "ALL",     // "ALL" | "A1" | "A2" | "B1" | "B2"
  sortOrder: "random",     // "random" (Shuffle, default) | "default" (A-Z)
  filterMode: "all",       // "all" | "review" | "unseen"
  onlyUnlearned: false,
  allWords: [],
  filteredWords: [],
  currentIndex: 0,
  isFlipped: false,
  isExpanded: false,
  isLoading: false,

  // Vault Filter State
  vaultSearchQuery: "",
  vaultLevelFilter: "ALL",
  vaultStatusFilter: "ALL",
  vaultSortOrder: "az", // "az" | "za" | "random"
  vaultSelectedWordId: null,
  lastFilteredVaultWords: [],

  async init(container, params = null) {
    this.container = container;
    this.currentTab = "flashcard";
    this.currentIndex = 0;
    this.isFlipped = false;
    this.isExpanded = false;
    this.vaultSelectedWordId = null;

    // Check query params if requested specific level or word
    if (params) {
      if (params.get("level")) {
        this.currentLevel = params.get("level").toUpperCase();
      }
      if (params.get("tab")) {
        this.currentTab = params.get("tab");
      }
      if (params.get("wordId")) {
        this.vaultSelectedWordId = params.get("wordId");
      }
      if (params.get("filter")) {
        this.filterMode = params.get("filter");
        this.onlyUnlearned = (this.filterMode === "review");
      }
    }

    await this.loadLevelData(this.currentLevel);
    this.bindKeyboardShortcuts();
  },

  speak(text, accentHint = null) {
    if (typeof AudioManager !== "undefined") {
      AudioManager.speak(text, accentHint);
    } else {
      Utils.showToast("ระบบเสียงกำลังเริ่มต้น...", "info");
    }
  },

  async loadLevelData(level = "A1") {
    this.currentLevel = level;
    this.isLoading = true;
    this.renderLoading();

    try {
      const words = await DataLoader.loadOxfordLevel(level);
      this.allWords = words || [];
      this.applyFilter();
      this.isLoading = false;
      this.render();
    } catch (err) {
      this.isLoading = false;
      this.renderError(err.message);
    }
  },

  applyFilter() {
    const progress = ProgressStore.getOxfordProgress();
    let words = this.allWords.filter(item => {
      const isMastered = !!(progress.mastered && progress.mastered[item.id]);
      const isReview = !!(progress.review && progress.review[item.id]);

      if (this.filterMode === "review") {
        return isReview;
      } else if (this.filterMode === "unseen") {
        return !isMastered && !isReview;
      }
      return true; // "all"
    });

    if (this.sortOrder === "random") {
      for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
      }
    } else {
      words.sort((a, b) => a.word.localeCompare(b.word));
    }

    this.filteredWords = words;

    if (this.currentIndex >= this.filteredWords.length) {
      this.currentIndex = Math.max(0, this.filteredWords.length - 1);
    }
    this.isFlipped = false;
  },

  bindKeyboardShortcuts() {
    if (this._keyHandlerBound) return;
    this._keyHandlerBound = true;

    window.addEventListener("keydown", (e) => {
      // Only execute if Oxford view is active and not typing in input
      if (Router.currentRoute !== "oxford") return;
      if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT" || document.activeElement.tagName === "TEXTAREA")) return;

      if (e.code === "Space") {
        e.preventDefault();
        this.toggleFlip();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        this.nextCard();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        this.prevCard();
      } else if (e.key === "1") {
        e.preventDefault();
        this.markAndAdvance("review");
      } else if (e.key === "2") {
        e.preventDefault();
        this.markAndAdvance("mastered");
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        this.toggleAccordion();
      }
    });
  },

  switchTab(tab) {
    if (tab === "vault" && this.currentTab === "vault" && this.vaultSelectedWordId) {
      this.vaultSelectedWordId = null;
    }
    this.currentTab = tab;
    this.render();
  },

  setLevelFilter(level) {
    if (this.currentLevel === level) return;
    this.loadLevelData(level);
  },

  toggleUnlearnedOnly() {
    this.onlyUnlearned = !this.onlyUnlearned;
    this.applyFilter();
    this.render();
  },

  toggleFlip() {
    this.isFlipped = !this.isFlipped;
    const cardEl = document.getElementById("oxford-flashcard-inner");
    if (cardEl) {
      if (this.isFlipped) cardEl.classList.add("rotate-y-180");
      else cardEl.classList.remove("rotate-y-180");
    }

    const acc = document.getElementById("oxford-details-accordion");
    const icon = document.getElementById("oxford-expand-icon");

    if (!this.isFlipped) {
      this.isExpanded = false;
      if (acc) acc.classList.add("hidden");
      if (icon) icon.style.transform = "rotate(0deg)";
    }
  },

  toggleAccordion() {
    if (!this.isFlipped) {
      Utils.showToast("กรุณาแตะการ์ดเพื่อดูคำแปลก่อนเปิดดูข้อมูลเชิงลึก & กริยา 3 ช่อง!", "warning");
      return;
    }
    this.isExpanded = !this.isExpanded;
    const acc = document.getElementById("oxford-details-accordion");
    const icon = document.getElementById("oxford-expand-icon");
    if (acc) {
      if (this.isExpanded) {
        acc.classList.remove("hidden");
        if (icon) icon.style.transform = "rotate(180deg)";
        setTimeout(() => acc.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
      } else {
        acc.classList.add("hidden");
        if (icon) icon.style.transform = "rotate(0deg)";
      }
    }
  },

  nextCard() {
    if (this.currentIndex < this.filteredWords.length - 1) {
      this.currentIndex++;
      this.isFlipped = false;
      this.isExpanded = false;
      this.render();
    } else {
      Utils.showToast("คุณเรียนจนถึงการ์ดใบสุดท้ายของชุดนี้แล้ว", "info");
    }
  },

  prevCard() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.isFlipped = false;
      this.isExpanded = false;
      this.render();
    }
  },

  jumpToIndex(idx) {
    if (isNaN(idx)) return;
    idx = Math.max(0, Math.min(this.filteredWords.length - 1, idx));
    this.currentIndex = idx;
    this.isFlipped = false;
    this.isExpanded = false;
    this.render();
  },

  setSortOrder(order) {
    this.sortOrder = order;
    this.applyFilter();
    this.currentIndex = 0;
    this.isFlipped = false;
    if (order === "random") {
      Utils.showToast("สลับสุ่มลำดับคำศัพท์เรียบร้อยแล้ว", "default");
    } else {
      Utils.showToast("จัดเรียงคำศัพท์ตามลำดับตัวอักษร (A–Z) เรียบร้อยแล้ว", "default");
    }
    this.render();
  },

  sortInOrder() {
    this.setSortOrder("default");
  },

  shuffleCards() {
    this.setSortOrder("random");
  },

  setFilterMode(mode) {
    this.filterMode = mode || "all";
    this.onlyUnlearned = (this.filterMode === "review");
    this.applyFilter();
    this.currentIndex = 0;
    this.render();
  },

  setUnlearnedFilter(onlyUnlearned) {
    this.setFilterMode(onlyUnlearned ? "review" : "all");
  },

  markAndAdvance(status) {
    const word = this.getCurrentWord();
    if (!word) return;

    ProgressStore.setOxfordWordStatus(word.id, status);
    if (status === "mastered") {
      Utils.showToast(`"${word.word}" บันทึกสถานะ: จำได้แล้ว`, "success");
    } else if (status === "review") {
      Utils.showToast(`"${word.word}" บันทึกสถานะ: ต้องทบทวน`, "warning");
    }

    if ((this.filterMode === "review" && status === "mastered") ||
        (this.filterMode === "unseen" && (status === "mastered" || status === "review"))) {
      this.applyFilter();
      if (this.filteredWords.length === 0) {
        this.render();
        return;
      }
    }

    // Automatically advance to the next card immediately!
    if (this.currentIndex < this.filteredWords.length - 1) {
      this.currentIndex++;
      this.isFlipped = false;
      this.isExpanded = false;
      this.render();
    } else {
      this.isFlipped = false;
      this.isExpanded = false;
      this.render();
      Utils.showToast("คุณเรียนจนถึงคำสุดท้ายของชุดนี้แล้ว!", "info");
    }
  },

  markCurrentWord(status) {
    this.markAndAdvance(status);
  },

  getCurrentWord() {
    if (!this.filteredWords || this.filteredWords.length === 0) return null;
    return this.filteredWords[this.currentIndex];
  },

  jumpToWord(wordId, level) {
    const doJump = () => {
      this.currentTab = "flashcard";
      this.vaultSelectedWordId = null;
      this.filterMode = "all";
      this.onlyUnlearned = false;
      this.applyFilter();
      const targetIdx = this.filteredWords.findIndex(w => w.id === wordId);
      if (targetIdx !== -1) {
        this.currentIndex = targetIdx;
      }
      this.isFlipped = false;
      this.render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (level && level !== this.currentLevel) {
      this.loadLevelData(level).then(doJump);
    } else {
      doJump();
    }
  },

  openVaultDetail(wordId) {
    this.vaultSelectedWordId = wordId;
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  closeVaultDetail() {
    this.vaultSelectedWordId = null;
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  toggleWordStatusInVault(wordId, status) {
    const progress = ProgressStore.getOxfordProgress();
    const currentMastered = !!(progress.mastered && progress.mastered[wordId]);
    const currentReview = !!(progress.review && progress.review[wordId]);

    if (status === "mastered") {
      if (currentMastered) {
        ProgressStore.setOxfordWordStatus(wordId, null);
        Utils.showToast("ยกเลิกสถานะจำได้แล้ว", "info");
      } else {
        ProgressStore.setOxfordWordStatus(wordId, "mastered");
        Utils.showToast("บันทึกสถานะ: จำได้แล้ว", "success");
      }
    } else if (status === "review") {
      if (currentReview) {
        ProgressStore.setOxfordWordStatus(wordId, null);
        Utils.showToast("ยกเลิกสถานะต้องทบทวน", "info");
      } else {
        ProgressStore.setOxfordWordStatus(wordId, "review");
        Utils.showToast("บันทึกสถานะ: ต้องทบทวน", "warning");
      }
    }
    this.render();
  },

  renderLoading() {
    this.container.innerHTML = `
      <div class="empty-state" style="padding: 4rem 1rem;">
        <div class="spinner"></div>
        <p style="margin-top: 1rem; color: var(--text-secondary); font-size: var(--font-size-sm);">
          กำลังโหลดชุดคำศัพท์ Oxford 3000 (${this.currentLevel})...
        </p>
      </div>
    `;
  },

  renderError(msg) {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">ไม่สามารถโหลดคลังคำศัพท์ได้</div>
        <div class="empty-state-desc">${Utils.escapeHtml(msg)}</div>
        <button class="btn btn-primary" onclick="OxfordEngine.loadLevelData('${this.currentLevel}')">ลองใหม่อีกครั้ง</button>
      </div>
    `;
  },

  render() {
    if (this.currentTab === "vault") {
      this.renderVaultView();
    } else {
      this.renderFlashcardView();
    }
  },

  renderFlashcardView() {
    const word = this.getCurrentWord();
    const total = this.filteredWords.length;
    const progress = ProgressStore.getOxfordProgress();
    const stats = ProgressStore.getOxfordStats();

    const isMastered = word ? !!(progress.mastered && progress.mastered[word.id]) : false;
    const isReview = word ? !!(progress.review && progress.review[word.id]) : false;

    const percent = total > 0 ? Math.round(((this.currentIndex + 1) / total) * 100) : 0;

    const levelBadgeColor = (lvl) => {
      switch ((lvl || "").toUpperCase()) {
        case "A1": return "badge-level-a1";
        case "A2": return "badge-level-a2";
        case "B1": return "badge-level-b1";
        case "B2": return "badge-level-b2";
        default: return "badge-default";
      }
    };

    this.container.innerHTML = `
      <div class="oxford-container">
        
        <!-- 1. Header Bar: Brand, Switcher & Central Settings -->
        <div class="oxford-header-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="brand-badge" style="background: var(--accent); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 700;">Oxford 3000</span>
            <span style="font-size: var(--font-size-sm); font-weight: 700; color: var(--text-primary);">Flashcard & Vocabulary Studio</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- Segmented Tab Switcher -->
            <div class="oxford-tabs">
              <button class="oxford-tab-btn active" onclick="OxfordEngine.switchTab('flashcard')">
                ${Icons.layers()} <span>เรียนการ์ด (Flashcard)</span>
              </button>
              <button class="oxford-tab-btn" onclick="OxfordEngine.switchTab('vault')">
                ${Icons.book()} <span>คลังคำศัพท์ (Bank)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 2. Master Operations Hub (Level Chips, Filters, Sorting, Navigation all unified at TOP) -->
        <div class="card" style="padding: 12px 16px; display: flex; flex-direction: column; gap: 10px;">
          <!-- Row A: CEFR Level Chips -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div class="oxford-level-chips">
              <button class="level-chip ${this.currentLevel === 'ALL' ? 'active' : ''}" onclick="OxfordEngine.setLevelFilter('ALL')">ทั้งหมด (3,805)</button>
              <button class="level-chip ${this.currentLevel === 'A1' ? 'active' : ''}" onclick="OxfordEngine.setLevelFilter('A1')">ระดับ A1 (1,076)</button>
              <button class="level-chip ${this.currentLevel === 'A2' ? 'active' : ''}" onclick="OxfordEngine.setLevelFilter('A2')">ระดับ A2 (990)</button>
              <button class="level-chip ${this.currentLevel === 'B1' ? 'active' : ''}" onclick="OxfordEngine.setLevelFilter('B1')">ระดับ B1 (902)</button>
              <button class="level-chip ${this.currentLevel === 'B2' ? 'active' : ''}" onclick="OxfordEngine.setLevelFilter('B2')">ระดับ B2 (837)</button>
            </div>
          </div>

          <!-- Row B: Operational Controls (Filter Mode + Ordering Mode + Quick Jump) -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <!-- Filter: คำศัพท์ทั้งหมด vs คำศัพท์ที่ต้องทวน vs คำศัพท์ที่ไม่เคยเจอ -->
              <div class="radio-pill-group" style="margin: 0;">
                <button class="radio-pill-btn ${this.filterMode === 'all' ? 'active' : ''}" onclick="OxfordEngine.setFilterMode('all')">
                  คำศัพท์ทั้งหมด
                </button>
                <button class="radio-pill-btn ${this.filterMode === 'review' ? 'active' : ''}" onclick="OxfordEngine.setFilterMode('review')">
                  คำศัพท์ที่ต้องทวน
                </button>
                <button class="radio-pill-btn ${this.filterMode === 'unseen' ? 'active' : ''}" onclick="OxfordEngine.setFilterMode('unseen')">
                  คำศัพท์ที่ไม่เคยเจอ
                </button>
              </div>

              <!-- Order: สุ่มลำดับ vs เรียง A-Z (Default is Random) -->
              <div class="radio-pill-group" style="margin: 0;">
                <button class="radio-pill-btn ${this.sortOrder === 'random' ? 'active' : ''}" onclick="OxfordEngine.shuffleCards()" title="สลับสุ่มลำดับคำศัพท์">
                  ${Icons.shuffle()} สุ่มลำดับ
                </button>
                <button class="radio-pill-btn ${this.sortOrder === 'default' ? 'active' : ''}" onclick="OxfordEngine.sortInOrder()" title="จัดเรียงตามลำดับตัวอักษร A-Z">
                  ${Icons.sortAsc()} เรียง A–Z
                </button>
              </div>
            </div>

            <!-- Quick Jump Input: Only shown if in Order (เรียง A-Z) Mode! In Random Mode: completely omitted! -->
            ${this.sortOrder === 'default' ? `
              <div class="oxford-order-rank-box" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">อันดับที่:</span>
                <input type="number" min="1" max="${total}" value="${this.currentIndex + 1}" style="width: 72px; padding: 4px 6px; font-size: 12px; font-family: var(--font-mono); text-align: center; border-radius: var(--radius-sm); border: 1px solid var(--border-light); background: var(--bg-surface);" class="input-text" onchange="OxfordEngine.jumpToIndex(parseInt(this.value) - 1)">
                <span style="font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono);">/ ทั้งหมด ${total.toLocaleString()} อันดับ</span>
              </div>
            ` : ''}
          </div>

          <!-- Row C: Progress & Mastery Tracker -->
          <div style="border-top: 1px solid var(--border-light); padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--font-size-xs); color: var(--text-secondary); margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
              <span style="display: flex; align-items: center; gap: 6px;">
                ${Icons.checkCircle()}
                <span>จำได้แล้ว <strong style="color: var(--success);">${stats.masteredCount}</strong> คำ • ต้องทบทวน <strong style="color: var(--danger);">${stats.reviewCount}</strong> คำ</span>
              </span>
              ${this.sortOrder === 'default' ? `
                <span class="badge badge-default" style="font-family: var(--font-mono); font-size: 11px;">${total > 0 ? (this.currentIndex + 1) : 0} / ${total} (${percent}%)</span>
              ` : ''}
            </div>
            ${this.sortOrder === 'default' ? `
              <div class="exam-progress-bar-bg" style="height: 6px;">
                <div class="exam-progress-bar-fill" style="width: ${percent}%;"></div>
              </div>
            ` : ''}
          </div>
        </div>

        ${!word ? `
          <div class="empty-state" style="padding: 3rem 1rem;">
            <div class="empty-state-title">ไม่พบคำศัพท์ในตัวกรองนี้</div>
            <div class="empty-state-desc">คุณอาจจำคำศัพท์ชุดนี้ครบทุกคำแล้ว หรือลองเลือกดูคำศัพท์ทั้งหมด</div>
            <button class="btn btn-primary" onclick="OxfordEngine.setFilterMode('all')">แสดงคำศัพท์ทั้งหมด</button>
          </div>
        ` : `
          <!-- 3. 3D FLASHCARD -->
          <div class="oxford-flashcard-perspective" onclick="OxfordEngine.handleCardClick(event)">
            <div class="oxford-flashcard-inner ${this.isFlipped ? 'rotate-y-180' : ''}" id="oxford-flashcard-inner">
              
              <!-- FRONT FACE (No spoiler: Word, IPA, POS, Audio, Verb indicator) -->
              <div class="oxford-card-face oxford-card-front">
                <div class="oxford-card-top" style="flex-wrap: wrap; gap: 6px;">
                  ${this.sortOrder === 'default' ? `
                    <span class="oxford-card-number">อันดับ #${this.currentIndex + 1} / ${total}</span>
                  ` : `
                    <span class="badge badge-subtle" style="font-size: 10px; display: inline-flex; align-items: center; gap: 4px;">
                      ${Icons.shuffle()} โหมดสุ่ม
                    </span>
                  `}
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${word.isVerb ? `<span class="badge badge-accent" style="font-size: 10px; display: inline-flex; align-items: center; gap: 3px;">${Icons.zap()} กริยา 3 ช่อง</span>` : ''}
                    ${isReview ? `<span class="badge badge-danger" style="font-size: 10px;">ต้องทบทวน</span>` : ''}
                    ${isMastered ? `<span class="badge badge-success" style="font-size: 10px;">จำได้แล้ว</span>` : ''}
                    <span class="badge ${levelBadgeColor(word.level)}" style="font-weight: 700; font-size: 11px;">${word.level}</span>
                  </div>
                </div>

                <div class="oxford-card-center">
                  <div class="oxford-word-row" style="flex-wrap: wrap; justify-content: center; gap: 8px;">
                    <h2 class="oxford-word-text" style="font-size: ${this.getResponsiveWordFontSize(word.word)};">${Utils.escapeHtml(word.word)}</h2>
                    <button class="btn btn-secondary btn-icon-sm oxford-speak-btn" onclick="event.stopPropagation(); OxfordEngine.speak('${word.word}')" title="ฟังการออกเสียงคำศัพท์">
                      ${Icons.volume()}
                    </button>
                  </div>

                  <div class="oxford-sub-row" style="flex-wrap: wrap; justify-content: center; gap: 8px;">
                    <span class="oxford-ipa-badge">${word.ipa ? (word.ipa.us || word.ipa.uk || "") : ""}</span>
                    <span class="oxford-pos-badge">${Utils.escapeHtml((word.partOfSpeech || []).join(", "))}</span>
                  </div>
                </div>

                <div class="oxford-card-bottom">
                  <span class="oxford-hint-flip">
                    ${Icons.rotate()} <span>แตะการ์ดเพื่อดูคำแปล & ข้อมูลเชิงลึก</span>
                  </span>
                </div>
              </div>

              <!-- BACK FACE (Answer: Thai Meaning, Definition, Core Example Sentence & Deep Dive Trigger) -->
              <div class="oxford-card-face oxford-card-back">
                <div class="oxford-card-top" style="flex-wrap: wrap; gap: 6px;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-weight: 700; color: var(--text-primary); font-size: var(--font-size-base);">${Utils.escapeHtml(word.word)}</span>
                    <span class="oxford-pos-badge">${Utils.escapeHtml((word.partOfSpeech || []).join(", "))}</span>
                    ${word.isVerb ? `<span class="badge badge-accent" style="font-size: 10px; display: inline-flex; align-items: center; gap: 3px;">${Icons.zap()} V.1 V.2 V.3</span>` : ''}
                  </div>
                  <span class="badge ${levelBadgeColor(word.level)}">${word.level}</span>
                </div>

                <div class="oxford-back-body">
                  <div class="oxford-meaning-section">
                    <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; letter-spacing: 0.5px;">ความหมายภาษาไทย</div>
                    <div class="oxford-thai-meaning" style="word-break: break-word; overflow-wrap: break-word;">${Utils.escapeHtml(word.meanings && word.meanings[0] ? word.meanings[0].thai : "")}</div>
                    <div class="oxford-en-def" style="word-break: break-word; overflow-wrap: break-word;">${Utils.escapeHtml(word.meanings && word.meanings[0] ? word.meanings[0].definition : "")}</div>
                  </div>

                  ${word.examples && word.examples[0] ? `
                    <div class="oxford-example-box">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div style="flex: 1; min-width: 0;">
                          <div class="oxford-example-en" style="word-break: break-word; overflow-wrap: break-word;">"${this.highlightTargetWord(word.examples[0].english, word.word)}"</div>
                          <div class="oxford-example-th" style="word-break: break-word; overflow-wrap: break-word;">${Utils.escapeHtml(word.examples[0].thai)}</div>
                        </div>
                        <button class="btn btn-secondary btn-icon-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${this.escapeQuotes(word.examples[0].english)}')" title="ฟังประโยคตัวอย่าง" style="flex-shrink: 0;">
                          ${Icons.volume()}
                        </button>
                      </div>
                    </div>
                  ` : ''}
                </div>

                <div class="oxford-card-bottom" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${word.word}')">
                    ${Icons.volume()} <span>ฟังคำศัพท์</span>
                  </button>

                  <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); OxfordEngine.toggleAccordion()" style="font-size: 11px; display: inline-flex; align-items: center; gap: 6px;">
                    ${Icons.zap()} <span>ดูข้อมูลเชิงลึก & กริยา 3 ช่อง</span>
                    <span id="oxford-expand-icon" style="display: inline-block; transition: transform 0.2s; transform: ${this.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};">${Icons.chevronDown()}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- 4. STUDY CONTROLS (Auto-advance on click - NO next button, NO flip button) -->
          <div class="oxford-controls-card">
            <div class="oxford-assessment-grid">
              <button class="btn btn-outline btn-review oxford-action-btn" onclick="OxfordEngine.markAndAdvance('review')" title="กดเลข 1 บนแป้นพิมพ์ได้">
                ${Icons.xCircle()} <span>ยังจำไม่ได้ [1]</span>
              </button>
              <button class="btn btn-success btn-mastered oxford-action-btn" onclick="OxfordEngine.markAndAdvance('mastered')" title="กดเลข 2 บนแป้นพิมพ์ได้">
                ${Icons.checkCircle()} <span>จำได้แล้ว [2]</span>
              </button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 6px;">
              <button class="btn btn-ghost btn-sm" onclick="OxfordEngine.prevCard()" ${this.currentIndex <= 0 ? 'disabled' : ''} style="font-size: 11px; color: var(--text-tertiary);">
                ${Icons.chevronLeft()} ย้อนกลับไปคำก่อนหน้า
              </button>
              <div class="oxford-keyboard-cue" style="margin: 0; font-size: 11px; color: var(--text-tertiary);">
                คีย์ลัด: <kbd>Space</kbd> พลิกการ์ด | <kbd>1</kbd> จำไม่ได้ | <kbd>2</kbd> จำได้แล้ว | <kbd>D</kbd> ข้อมูลเชิงลึก
              </div>
            </div>
          </div>

          <!-- 6. DEEP DIVE ACCORDION DETAILS (Only accessible when card is flipped!) -->
          <div id="oxford-details-accordion" class="oxford-accordion-section ${this.isFlipped && this.isExpanded ? '' : 'hidden'}">
            <div class="oxford-accordion-header">
              <span style="font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 6px;">
                ${Icons.layers()} ข้อมูลเชิงลึก Oxford 3000: <strong>${Utils.escapeHtml(word.word)}</strong>
              </span>
            </div>

            ${this.renderWordDeepDiveHtml(word)}
          </div>
        `}

      </div>
    `;
  },

  renderWordDeepDiveHtml(word) {
    if (!word) return "";

    const levelBadgeColor = (lvl) => {
      switch ((lvl || "").toUpperCase()) {
        case "A1": return "badge-level-a1";
        case "A2": return "badge-level-a2";
        case "B1": return "badge-level-b1";
        case "B2": return "badge-level-b2";
        default: return "badge-default";
      }
    };

    return `
      <!-- Item 0: Core Thai Meaning & Definition Overview (จากหลัง Flashcard) -->
      <div class="oxford-detail-item">
        <div class="oxford-detail-title" style="color: var(--accent); font-size: 13px;">
          ${Icons.book()} <span>ความหมายหลัก & คำจำกัดความ (Meaning & Definition)</span>
        </div>
        <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 12px 14px; margin-top: 8px; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; min-width: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-weight: 800; color: var(--text-primary); font-size: 1.15rem;">${Utils.escapeHtml(word.word)}</span>
              <span class="oxford-pos-badge">${Utils.escapeHtml((word.partOfSpeech || []).join(", "))}</span>
              <span class="badge ${levelBadgeColor(word.level)}" style="font-weight: 700;">${word.level}</span>
              ${word.isVerb ? `<span class="badge badge-accent" style="font-size: 10px; display: inline-flex; align-items: center; gap: 3px;">${Icons.zap()} กริยา 3 ช่อง</span>` : ''}
            </div>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${word.word}')" style="display: inline-flex; align-items: center; gap: 4px;">
              ${Icons.volume()} <span>ออกเสียง</span>
            </button>
          </div>

          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; letter-spacing: 0.5px;">ความหมายภาษาไทย</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--success); margin-top: 2px; word-break: break-word; overflow-wrap: break-word; line-height: 1.3;">
              ${Utils.escapeHtml(word.meanings && word.meanings[0] ? word.meanings[0].thai : "")}
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--text-secondary); font-style: italic; margin-top: 4px; word-break: break-word; overflow-wrap: break-word; line-height: 1.4;">
              ${Utils.escapeHtml(word.meanings && word.meanings[0] ? word.meanings[0].definition : "")}
            </div>
          </div>

          ${word.examples && word.examples[0] ? `
            <div style="background-color: var(--bg-subtle); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 8px 12px; margin-top: 2px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 10px; color: var(--text-tertiary); font-weight: 600; margin-bottom: 2px;">ประโยคตัวอย่างหลัก</div>
                  <div class="oxford-example-en" style="word-break: break-word; overflow-wrap: break-word;">"${this.highlightTargetWord(word.examples[0].english, word.word)}"</div>
                  <div class="oxford-example-th" style="word-break: break-word; overflow-wrap: break-word; margin-top: 2px;">${Utils.escapeHtml(word.examples[0].thai)}</div>
                </div>
                <button class="btn btn-secondary btn-icon-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${this.escapeQuotes(word.examples[0].english)}')" title="ฟังประโยคตัวอย่าง" style="flex-shrink: 0;">
                  ${Icons.volume()}
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Item 1: Complete Verb 3 Forms (V1, V2, V3) with Sentences for Verbs -->
      ${word.isVerb && word.verb3Forms ? `
        <div class="oxford-detail-item oxford-verb3-panel">
          <div class="oxford-detail-title" style="color: var(--accent); font-size: 13px;">
            ${Icons.zap()} <span>กริยา 3 ช่อง (3 Verb Forms) พร้อมประโยคตัวอย่างครบทุกช่อง</span>
          </div>
          
          <div class="oxford-verb3-grid">
            <!-- ช่อง 1: V.1 Base / Present -->
            <div class="oxford-vcard vcard-v1">
              <div class="vcard-header">
                <span class="vcard-badge badge-v1">ช่อง 1 (V.1)</span>
                <button class="btn btn-ghost btn-icon-xs" onclick="event.stopPropagation(); OxfordEngine.speak('${word.verb3Forms.v1.form}')" title="ฟังการออกเสียง V.1">${Icons.volume()}</button>
              </div>
              <div class="vcard-form">${Utils.escapeHtml(word.verb3Forms.v1.form)}</div>
              <div class="vcard-meaning">${Utils.escapeHtml(word.verb3Forms.v1.meaning)}</div>
              <div class="vcard-desc">${Utils.escapeHtml(word.verb3Forms.v1.desc)}</div>
              <div class="vcard-example">
                <div class="vcard-ex-en">"${this.highlightTargetWord(word.verb3Forms.v1.example.english, word.verb3Forms.v1.form)}"</div>
                <div class="vcard-ex-th">${Utils.escapeHtml(word.verb3Forms.v1.example.thai)}</div>
                <div style="text-align: right; margin-top: 2px;">
                  <button class="btn btn-ghost btn-icon-xs" onclick="event.stopPropagation(); OxfordEngine.speak('${this.escapeQuotes(word.verb3Forms.v1.example.english)}')" title="ฟังประโยค">${Icons.volume()}</button>
                </div>
              </div>
            </div>

            <!-- ช่อง 2: V.2 Past Simple -->
            <div class="oxford-vcard vcard-v2">
              <div class="vcard-header">
                <span class="vcard-badge badge-v2">ช่อง 2 (V.2)</span>
                <button class="btn btn-ghost btn-icon-xs" onclick="event.stopPropagation(); OxfordEngine.speak('${word.verb3Forms.v2.form}')" title="ฟังการออกเสียง V.2">${Icons.volume()}</button>
              </div>
              <div class="vcard-form">${Utils.escapeHtml(word.verb3Forms.v2.form)}</div>
              <div class="vcard-meaning">${Utils.escapeHtml(word.verb3Forms.v2.meaning)}</div>
              <div class="vcard-desc">${Utils.escapeHtml(word.verb3Forms.v2.desc)}</div>
              <div class="vcard-example">
                <div class="vcard-ex-en">"${this.highlightTargetWord(word.verb3Forms.v2.example.english, word.verb3Forms.v2.form)}"</div>
                <div class="vcard-ex-th">${Utils.escapeHtml(word.verb3Forms.v2.example.thai)}</div>
                <div style="text-align: right; margin-top: 2px;">
                  <button class="btn btn-ghost btn-icon-xs" onclick="event.stopPropagation(); OxfordEngine.speak('${this.escapeQuotes(word.verb3Forms.v2.example.english)}')" title="ฟังประโยค">${Icons.volume()}</button>
                </div>
              </div>
            </div>

            <!-- ช่อง 3: V.3 Past Participle -->
            <div class="oxford-vcard vcard-v3">
              <div class="vcard-header">
                <span class="vcard-badge badge-v3">ช่อง 3 (V.3)</span>
                <button class="btn btn-ghost btn-icon-xs" onclick="event.stopPropagation(); OxfordEngine.speak('${word.verb3Forms.v3.form}')" title="ฟังการออกเสียง V.3">${Icons.volume()}</button>
              </div>
              <div class="vcard-form">${Utils.escapeHtml(word.verb3Forms.v3.form)}</div>
              <div class="vcard-meaning">${Utils.escapeHtml(word.verb3Forms.v3.meaning)}</div>
              <div class="vcard-desc">${Utils.escapeHtml(word.verb3Forms.v3.desc)}</div>
              <div class="vcard-example">
                <div class="vcard-ex-en">"${this.highlightTargetWord(word.verb3Forms.v3.example.english, word.verb3Forms.v3.form)}"</div>
                <div class="vcard-ex-th">${Utils.escapeHtml(word.verb3Forms.v3.example.thai)}</div>
                <div style="text-align: right; margin-top: 2px;">
                  <button class="btn btn-ghost btn-icon-xs" onclick="event.stopPropagation(); OxfordEngine.speak('${this.escapeQuotes(word.verb3Forms.v3.example.english)}')" title="ฟังประโยค">${Icons.volume()}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sub Row: Continuous & Third Person Singular -->
          ${word.verb3Forms.ving ? `
            <div class="oxford-vcard-sub-row">
              <div class="vcard-sub-chip">
                <span class="vcard-badge badge-sub">V-ing</span>
                <strong>${Utils.escapeHtml(word.verb3Forms.ving.form)}</strong>
                <span style="color: var(--text-secondary); font-size: 11px;">(${Utils.escapeHtml(word.verb3Forms.ving.meaning)})</span>
                <button class="btn btn-ghost btn-icon-xs" onclick="event.stopPropagation(); OxfordEngine.speak('${word.verb3Forms.ving.form}')" title="ฟังเสียง">${Icons.volume()}</button>
              </div>
              ${word.verb3Forms.vs ? `
                <div class="vcard-sub-chip">
                  <span class="vcard-badge badge-sub">V-s/es</span>
                  <strong>${Utils.escapeHtml(word.verb3Forms.vs.form)}</strong>
                  <button class="btn btn-ghost btn-icon-xs" onclick="event.stopPropagation(); OxfordEngine.speak('${word.verb3Forms.vs.form}')" title="ฟังเสียง">${Icons.volume()}</button>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Item 2: Multiple Contextual Examples with Thai Translations -->
      ${word.examples && word.examples.length > 0 ? `
        <div class="oxford-detail-item">
          <div class="oxford-detail-title">
            ${Icons.messageSquare()} <span>คลังประโยคตัวอย่างทั้งหมด (${word.examples.length} ประโยคพร้อมคำแปล)</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            ${word.examples.map((ex, exIdx) => `
              <div class="oxford-example-item">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                    <span class="badge badge-default" style="font-size: 10px; padding: 1px 6px;">ตัวอย่างที่ ${exIdx + 1} ${ex.type ? `• ${ex.type}` : ''}</span>
                  </div>
                  <div class="oxford-example-en">${this.highlightTargetWord(ex.english, word.word)}</div>
                  <div class="oxford-example-th">${Utils.escapeHtml(ex.thai)}</div>
                </div>
                <button class="btn btn-secondary btn-icon-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${this.escapeQuotes(ex.english)}')" style="flex-shrink: 0;" title="ฟังเสียงประโยค">
                  ${Icons.volume()}
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}

      <!-- Item 3: US vs UK Pronunciation & IPA Comparison -->
      <div class="oxford-detail-item">
        <div class="oxford-detail-title">
          ${Icons.mic()} <span>การออกเสียงและสัญลักษณ์ IPA (US vs UK)</span>
        </div>
        <div class="oxford-ipa-grid">
          <div class="oxford-ipa-box">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">US (American)</div>
              <div style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary); margin-top: 2px; font-size: 13px; word-break: break-word; overflow-wrap: break-word;">${word.ipa ? (word.ipa.us || "-") : "-"}</div>
            </div>
            <button class="btn btn-secondary btn-icon-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${word.word}', 'US')" title="ฟังสำเนียง US" style="flex-shrink: 0;">${Icons.volume()}</button>
          </div>
          <div class="oxford-ipa-box">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">UK (British)</div>
              <div style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary); margin-top: 2px; font-size: 13px; word-break: break-word; overflow-wrap: break-word;">${word.ipa ? (word.ipa.uk || "-") : "-"}</div>
            </div>
            <button class="btn btn-secondary btn-icon-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${word.word}', 'GB')" title="ฟังสำเนียง UK" style="flex-shrink: 0;">${Icons.volume()}</button>
          </div>
        </div>
      </div>

      <!-- Item 4: Collocations & Common Word Pairs -->
      ${word.collocations && word.collocations.length > 0 ? `
        <div class="oxford-detail-item">
          <div class="oxford-detail-title">
            ${Icons.link()} <span>Collocations และคำคู่ที่พบบ่อย</span>
          </div>
          <div class="oxford-collocation-grid">
            ${word.collocations.map(col => `
              <div class="oxford-collocation-chip">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 600; color: var(--text-primary); font-size: 12px; word-break: break-word; overflow-wrap: break-word;">${Utils.escapeHtml(col.phrase)}</div>
                  <div style="color: var(--text-secondary); font-size: 11px; word-break: break-word; overflow-wrap: break-word;">${Utils.escapeHtml(col.thai)}</div>
                </div>
                <button class="btn btn-ghost btn-icon-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${this.escapeQuotes(col.phrase)}')" style="flex-shrink: 0;">${Icons.volume()}</button>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}

      <!-- Item 5: Grammar Rules & Important Notes -->
      ${word.grammarNotes && word.grammarNotes.length > 0 ? `
        <div class="oxford-detail-item">
          <div class="oxford-detail-title">
            ${Icons.alertTriangle()} <span>ไวยากรณ์และข้อสังเกตสำคัญ</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
            ${word.grammarNotes.map(g => `
              <div class="oxford-grammar-card">
                <div style="font-weight: 600; color: var(--accent); font-size: 12px;">${Utils.escapeHtml(g.rule)}</div>
                <div style="color: var(--text-secondary); font-size: 11px; margin-top: 2px;">${Utils.escapeHtml(g.note)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    `;
  },

  renderVaultDetailView(word) {
    const progress = ProgressStore.getOxfordProgress();
    const isMastered = !!(progress.mastered && progress.mastered[word.id]);
    const isReview = !!(progress.review && progress.review[word.id]);

    const levelBadgeColor = (lvl) => {
      switch ((lvl || "").toUpperCase()) {
        case "A1": return "badge-level-a1";
        case "A2": return "badge-level-a2";
        case "B1": return "badge-level-b1";
        case "B2": return "badge-level-b2";
        default: return "badge-default";
      }
    };

    const vaultList = (this.lastFilteredVaultWords && this.lastFilteredVaultWords.length > 0) ? this.lastFilteredVaultWords : this.allWords;
    const currentVaultIdx = vaultList.findIndex(w => w.id === word.id);
    const prevWord = currentVaultIdx > 0 ? vaultList[currentVaultIdx - 1] : null;
    const nextWord = (currentVaultIdx !== -1 && currentVaultIdx < vaultList.length - 1) ? vaultList[currentVaultIdx + 1] : null;

    this.container.innerHTML = `
      <div class="oxford-container">
        <!-- 1. Header Bar with Back Button -->
        <div class="oxford-header-bar">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="OxfordEngine.closeVaultDetail()" style="display: inline-flex; align-items: center; gap: 6px;">
              ${Icons.chevronLeft()} <span>ย้อนกลับไปคลังคำศัพท์</span>
            </button>
            <span class="brand-badge" style="background: var(--accent); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 700;">Oxford 3000</span>
            <span style="font-size: var(--font-size-sm); font-weight: 600; color: var(--text-primary);">ข้อมูลเชิงลึก (Vocabulary Insight)</span>
          </div>
        </div>

        <!-- 2. Word Hero Card -->
        <div class="card" style="padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
            <!-- Left Info -->
            <div style="flex: 1; min-width: 250px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                <span class="badge ${levelBadgeColor(word.level)}" style="font-weight: 700; font-size: 12px; padding: 2px 8px;">${word.level}</span>
                <span class="oxford-pos-badge">${Utils.escapeHtml((word.partOfSpeech || []).join(", "))}</span>
                ${word.isVerb ? `<span class="badge badge-accent" style="font-size: 11px; display: inline-flex; align-items: center; gap: 3px;">${Icons.zap()} กริยา 3 ช่อง</span>` : ''}
                ${isMastered ? `<span class="badge badge-success" style="font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">${Icons.check()} จำได้แล้ว</span>` : ''}
                ${isReview ? `<span class="badge badge-danger" style="font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">${Icons.repeat()} ต้องทบทวน</span>` : ''}
              </div>

              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <h1 style="font-size: ${this.getResponsiveWordFontSize(word.word)}; font-weight: 800; color: var(--text-primary); margin: 0; line-height: 1.15;">
                  ${Utils.escapeHtml(word.word)}
                </h1>
                <button class="btn btn-secondary btn-icon-sm oxford-speak-btn" onclick="OxfordEngine.speak('${word.word}')" title="ฟังการออกเสียงคำศัพท์">
                  ${Icons.volume()}
                </button>
              </div>

              <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px; font-family: var(--font-mono); color: var(--text-secondary); font-size: 13px;">
                <span>${word.ipa ? (word.ipa.us || word.ipa.uk || "") : ""}</span>
              </div>
            </div>

            <!-- Right: Status Toggle Buttons & Jump to Flashcard -->
            <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn btn-sm ${isReview ? 'btn-danger' : 'btn-outline'}" onclick="OxfordEngine.toggleWordStatusInVault('${word.id}', 'review')" title="บันทึกว่าต้องทบทวนคำนี้">
                  ${Icons.xCircle()} <span>${isReview ? 'ทบทวนแล้ว' : 'ต้องทบทวน'}</span>
                </button>
                <button class="btn btn-sm ${isMastered ? 'btn-success' : 'btn-outline'}" onclick="OxfordEngine.toggleWordStatusInVault('${word.id}', 'mastered')" title="บันทึกว่าจำคำนี้ได้แล้ว">
                  ${Icons.checkCircle()} <span>${isMastered ? 'จำได้แล้ว' : 'ทำเครื่องหมายว่าจำได้'}</span>
                </button>
              </div>

              <button class="btn btn-primary btn-sm" onclick="OxfordEngine.jumpToWord('${word.id}', '${word.level}')" style="display: inline-flex; align-items: center; gap: 6px;">
                ${Icons.layers()} <span>เปิดฝึกใน Flashcard</span> ${Icons.chevronRight()}
              </button>
            </div>
          </div>

          <!-- Vault Index Navigation -->
          ${currentVaultIdx !== -1 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 10px; font-size: 12px; color: var(--text-secondary); flex-wrap: wrap; gap: 8px;">
              <div>
                ${prevWord ? `
                  <button class="btn btn-ghost btn-sm" onclick="OxfordEngine.openVaultDetail('${prevWord.id}')" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px;">
                    ${Icons.chevronLeft()} <span>คำก่อนหน้า: <strong>${Utils.escapeHtml(prevWord.word)}</strong></span>
                  </button>
                ` : `<span></span>`}
              </div>
              <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);">
                ลำดับคำในคลัง: ${currentVaultIdx + 1} / ${vaultList.length}
              </div>
              <div>
                ${nextWord ? `
                  <button class="btn btn-ghost btn-sm" onclick="OxfordEngine.openVaultDetail('${nextWord.id}')" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px;">
                    <span>คำถัดไป: <strong>${Utils.escapeHtml(nextWord.word)}</strong></span> ${Icons.chevronRight()}
                  </button>
                ` : `<span></span>`}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- 3. Full Deep Dive Information Cards -->
        <div class="oxford-accordion-section" style="display: flex;">
          <div class="oxford-accordion-header">
            <span style="font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 6px;">
              ${Icons.layers()} ข้อมูลเชิงลึกและสารบบคำศัพท์: <strong>${Utils.escapeHtml(word.word)}</strong>
            </span>
          </div>

          ${this.renderWordDeepDiveHtml(word)}
        </div>

      </div>
    `;
  },

  renderVaultView() {
    const progress = ProgressStore.getOxfordProgress();
    const query = (this.vaultSearchQuery || "").toLowerCase().trim();
    const levelFilter = this.vaultLevelFilter || "ALL";
    const statusFilter = this.vaultStatusFilter || "ALL";

    const filtered = this.allWords.filter(item => {
      // Query match (word, thai meaning, definition)
      const matchQuery = !query || 
        item.word.toLowerCase().includes(query) ||
        (item.meanings || []).some(m => (m.thai || "").includes(query) || (m.definition || "").toLowerCase().includes(query));

      // Level match
      const matchLevel = levelFilter === "ALL" || item.level === levelFilter;

      // Status match
      const isMastered = !!(progress.mastered && progress.mastered[item.id]);
      const isReview = !!(progress.review && progress.review[item.id]);
      let matchStatus = true;
      if (statusFilter === "mastered") matchStatus = isMastered;
      else if (statusFilter === "review") matchStatus = isReview;
      else if (statusFilter === "new") matchStatus = !isMastered && !isReview;

      return matchQuery && matchLevel && matchStatus;
    });

    // Apply Vault Sorting: A-Z, Z-A, or random
    if (this.vaultSortOrder === "za") {
      filtered.sort((a, b) => b.word.localeCompare(a.word));
    } else if (this.vaultSortOrder === "random") {
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
    } else {
      filtered.sort((a, b) => a.word.localeCompare(b.word));
    }

    this.lastFilteredVaultWords = filtered;

    // If a word is selected in the Vault, show its dedicated Word Detail View!
    if (this.vaultSelectedWordId) {
      const selectedWord = this.allWords.find(w => w.id === this.vaultSelectedWordId);
      if (selectedWord) {
        return this.renderVaultDetailView(selectedWord);
      } else {
        this.vaultSelectedWordId = null;
      }
    }

    const levelBadgeColor = (lvl) => {
      switch ((lvl || "").toUpperCase()) {
        case "A1": return "badge-level-a1";
        case "A2": return "badge-level-a2";
        case "B1": return "badge-level-b1";
        case "B2": return "badge-level-b2";
        default: return "badge-default";
      }
    };

    this.container.innerHTML = `
      <div class="oxford-container">
        <!-- Header Sub-bar & Segmented Control -->
        <div class="oxford-header-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="brand-badge" style="background: var(--accent); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 6px;">Oxford 3000</span>
            <span style="font-size: var(--font-size-sm); font-weight: 600; color: var(--text-primary);">คลังคำศัพท์และสารบบ (Vault Bank)</span>
          </div>

          <div class="oxford-tabs">
            <button class="oxford-tab-btn" onclick="OxfordEngine.switchTab('flashcard')">
              ${Icons.layers()} <span>เรียนการ์ด (Flashcard)</span>
            </button>
            <button class="oxford-tab-btn active" onclick="OxfordEngine.switchTab('vault')">
              ${Icons.book()} <span>คลังคำศัพท์ (Bank)</span>
            </button>
          </div>
        </div>

        <!-- Vault Search & Filter Bar -->
        <div class="oxford-vault-filter-card">
          <div style="position: relative; flex: 1;">
            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);">
              ${Icons.search()}
            </span>
            <input type="text" 
                   id="oxford-vault-search" 
                   class="input-text" 
                   style="width: 100%; padding-left: 32px;" 
                   placeholder="ค้นหาคำศัพท์ภาษาอังกฤษ หรือความหมายภาษาไทย..." 
                   value="${Utils.escapeHtml(this.vaultSearchQuery)}"
                   oninput="OxfordEngine.handleVaultSearch(this.value)">
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <!-- Level Filter in Vault -->
            <select class="input-text" style="font-size: 12px; padding: 6px 10px;" onchange="OxfordEngine.setVaultLevel(this.value)">
              <option value="ALL" ${levelFilter === 'ALL' ? 'selected' : ''}>ระดับ CEFR ทั้งหมด</option>
              <option value="A1" ${levelFilter === 'A1' ? 'selected' : ''}>ระดับ A1</option>
              <option value="A2" ${levelFilter === 'A2' ? 'selected' : ''}>ระดับ A2</option>
              <option value="B1" ${levelFilter === 'B1' ? 'selected' : ''}>ระดับ B1</option>
              <option value="B2" ${levelFilter === 'B2' ? 'selected' : ''}>ระดับ B2</option>
            </select>

            <!-- Status Filter in Vault -->
            <select class="input-text" style="font-size: 12px; padding: 6px 10px;" onchange="OxfordEngine.setVaultStatus(this.value)">
              <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>สถานะทั้งหมด</option>
              <option value="mastered" ${statusFilter === 'mastered' ? 'selected' : ''}>จำได้แล้ว (Mastered)</option>
              <option value="review" ${statusFilter === 'review' ? 'selected' : ''}>ต้องทบทวน (Review)</option>
              <option value="new" ${statusFilter === 'new' ? 'selected' : ''}>ยังไม่ได้เรียน</option>
            </select>

            <!-- Sort Order Filter in Vault -->
            <select class="input-text" style="font-size: 12px; padding: 6px 10px;" onchange="OxfordEngine.setVaultSort(this.value)">
              <option value="az" ${this.vaultSortOrder === 'az' ? 'selected' : ''}>เรียงตามลำดับ A-Z</option>
              <option value="za" ${this.vaultSortOrder === 'za' ? 'selected' : ''}>เรียงลำดับ Z-A</option>
              <option value="random" ${this.vaultSortOrder === 'random' ? 'selected' : ''}>สุ่มลำดับ (Random)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: var(--font-size-xs); color: var(--text-secondary); flex-wrap: wrap; gap: 4px;">
          <span>พบคำศัพท์ <strong>${filtered.length}</strong> คำ</span>
          <span style="color: var(--accent); font-weight: 500;">แตะที่การ์ดเพื่อดูข้อมูลเชิงลึก (มีปุ่มไป Flashcard ในหน้าเชิงลึก)</span>
        </div>

        <!-- Grid of Word Cards -->
        ${filtered.length === 0 ? `
          <div class="empty-state" style="padding: 3rem 1rem;">
            ${Icons.inbox()}
            <div class="empty-state-title" style="margin-top: 8px;">ไม่พบคำศัพท์ตามเงื่อนไขที่ค้นหา</div>
            <div class="empty-state-desc">ลองค้นหาด้วยคำอื่น หรือล้างตัวกรอง</div>
          </div>
        ` : `
          <div class="oxford-vault-grid">
            ${filtered.map(w => {
              const isM = !!(progress.mastered && progress.mastered[w.id]);
              const isR = !!(progress.review && progress.review[w.id]);

              return `
                <div class="oxford-vault-card" onclick="OxfordEngine.openVaultDetail('${w.id}')" title="คลิกเพื่อดูข้อมูลเชิงลึกและกริยา 3 ช่อง">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <span class="badge ${levelBadgeColor(w.level)}">${w.level}</span>
                      ${w.isVerb ? `<span class="badge badge-accent" style="font-size: 10px; padding: 1px 6px; display: inline-flex; align-items: center; gap: 2px;">${Icons.zap()} V 3 ช่อง</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      ${isM ? `<span class="badge badge-success" style="font-size: 10px; padding: 1px 6px;">จำได้แล้ว</span>` : ''}
                      ${isR ? `<span class="badge badge-danger" style="font-size: 10px; padding: 1px 6px;">ต้องทบทวน</span>` : ''}
                      <button class="btn btn-ghost btn-icon-sm" onclick="event.stopPropagation(); OxfordEngine.speak('${w.word}')" title="ฟังเสียง">
                        ${Icons.volume()}
                      </button>
                    </div>
                  </div>

                  <h3 class="oxford-vault-word">${Utils.escapeHtml(w.word)}</h3>
                  <div class="oxford-vault-meta">
                    <span style="font-family: var(--font-mono);">${w.ipa ? (w.ipa.us || w.ipa.uk || "") : ""}</span> • 
                    <em>${Utils.escapeHtml((wordPart => (wordPart || []).join(", "))(w.partOfSpeech))}</em>
                  </div>

                  <div class="oxford-vault-thai">${Utils.escapeHtml(w.meanings && w.meanings[0] ? w.meanings[0].thai : "")}</div>

                  <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-tertiary);">
                    <span style="color: var(--accent); font-weight: 600;">ดูข้อมูลเชิงลึก</span>
                    <span>${Icons.chevronRight()}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}

      </div>
    `;
  },

  handleCardClick(e) {
    if (e.target.closest("button") || e.target.closest("a")) return;
    this.toggleFlip();
  },

  prevQuestionCard() {
    this.prevCard();
  },

  nextQuestionCard() {
    this.nextCard();
  },

  handleVaultSearch(query) {
    this.vaultSearchQuery = query;
    this.renderVaultView();
    // Maintain input focus
    const input = document.getElementById("oxford-vault-search");
    if (input) {
      input.focus();
      input.selectionStart = input.selectionEnd = input.value.length;
    }
  },

  setVaultLevel(level) {
    this.vaultLevelFilter = level;
    // If not loaded yet and level is specific, load it
    if (level !== "ALL" && this.currentLevel !== level && this.currentLevel !== "ALL") {
      this.loadLevelData(level).then(() => {
        this.currentTab = "vault";
        this.renderVaultView();
      });
    } else {
      this.renderVaultView();
    }
  },

  setVaultStatus(status) {
    this.vaultStatusFilter = status;
    this.renderVaultView();
  },

  setVaultSort(order) {
    this.vaultSortOrder = order;
    this.renderVaultView();
  },

  highlightTargetWord(sentence, targetWord) {
    if (!sentence || !targetWord) return sentence || "";
    try {
      const regex = new RegExp(`\\b(${targetWord}|${targetWord}ed|${targetWord}ing|${targetWord}s)\\b`, "gi");
      return Utils.escapeHtml(sentence).replace(regex, '<span class="oxford-highlight">$1</span>');
    } catch (e) {
      return Utils.escapeHtml(sentence);
    }
  },

  escapeQuotes(str) {
    if (!str) return "";
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  },

  getResponsiveWordFontSize(word) {
    const len = (word || "").length;
    if (len > 15) return "clamp(1.25rem, 4.2vw, 1.65rem)";
    if (len > 12) return "clamp(1.4rem, 4.8vw, 1.95rem)";
    if (len > 9)  return "clamp(1.6rem, 5.5vw, 2.3rem)";
    if (len > 6)  return "clamp(1.8rem, 6.5vw, 2.5rem)";
    return "clamp(2rem, 7.5vw, 2.85rem)";
  }
};

if (typeof window !== "undefined") {
  window.OxfordEngine = OxfordEngine;
}
