/**
 * ExamEngine Module
 * Advanced realistic exam simulation with 2-Tab Architecture:
 * - Tab 1: คลังข้อสอบรายวิชา (300 ข้อ) (Bank)
 * - Tab 2: ชุดข้อสอบเสมือนจริง (160 ข้อ) (Mock Sets - Default Landing Tab)
 * 
 * Features:
 * - Realistic Mock Sets: 8 subjects x 20 questions = 160 questions
 * - Balanced Difficulty: Exactly 10 easy (levels 1-3) + 10 hard (levels 4-5) per subject
 * - Module 08 marked as 'โมดูลพิเศษ (บูรณาการ)'
 * - Deduplication across sets up to 15 unique sets
 * - Locking mechanism: Shuffle locked permanently once started or completed
 * - Retake support: Retakes exact same 160 questions
 * - In-set Sticky Subject Chips Bar for fast jumping across 8 subjects
 * - 180-minute realistic countdown timer
 * - Subject-by-subject score breakdown on submission
 * - Deep 9-Section explanations with instant Eye button
 * - Strict warning confirmation modal for reset all sets
 * - Zero Emojis (Pure SVG Icons via Icons.*)
 */
const ExamEngine = {
  // Navigation & Studio State
  currentTab: "sets", // "sets" (default) | "bank"
  activeSetId: null, // string (e.g. "set_1") when taking/reviewing a set, null when in Sets Hub
  activeSet: null,
  allExamSubjectsData: null,
  questionMap: new Map(), // qId -> question object
  mockSetsData: null,

  // Subject Practice Mode (Bank) State
  currentSubjectId: "01",
  examData: null,
  allQuestions: [],
  questions: [],
  currentIndex: 0,
  userAnswers: {}, // { [qId]: "ก" | "ข" | "ค" | "ง" }
  flaggedQuestions: new Set(),
  showingExplanations: new Set(), // Set of qIds with eye explanation open
  isSubmitted: false,
  isTimed: true,
  timerMinutes: 60, // Unlimited custom minutes
  timerSeconds: 3600,
  timerInterval: null,
  timeSpentSeconds: 0,
  filterReviewWrongOnly: false,

  // Bank Filters
  difficultyFilter: "all", // "all" | "easy" | "hard"
  isRandomized: false,
  sessionCount: "all",
  historyModalFilter: "all",
  hintDismissed: (function() {
    try {
      return localStorage.getItem("policeprep_exam_hint_dismissed") === "true";
    } catch (e) {
      return false;
    }
  })(),

  // 8 Subjects Metadata for Single-Subject Practice Bank
  SUBJECT_META: [
    { id: "01", name: "คณิตศาสตร์ (ความสามารถทั่วไป)", shortName: "คณิต", isSpecial: false },
    { id: "02", name: "ภาษาไทย", shortName: "ไทย", isSpecial: false },
    { id: "03", name: "ภาษาอังกฤษ", shortName: "อังกฤษ", isSpecial: false },
    { id: "04", name: "คอมพิวเตอร์และเทคโนโลยีสารสนเทศ", shortName: "คอมพิวเตอร์", isSpecial: false },
    { id: "05", name: "กฎหมายที่ประชาชนควรรู้", shortName: "กฎหมาย", isSpecial: false },
    { id: "06", name: "ระเบียบสำนักนายกรัฐมนตรี ว่าด้วยงานสารบรรณ", shortName: "งานสารบรรณ", isSpecial: false },
    { id: "07", name: "ระเบียบสำนักงานตำรวจแห่งชาติ (ลักษณะที่ 54)", shortName: "ตร. ลักษณะ 54", isSpecial: false },
    { id: "08", name: "สรุปสาระสำคัญบูรณาการ (งานสารบรรณ + ลักษณะที่ 54)", shortName: "พิเศษบูรณาการ", isSpecial: true }
  ],

  // 6 Official Exam Subjects for Mock Sets (150 Questions Total)
  MOCK_SUBJECT_SPECS: [
    {
      key: "math",
      id: "01",
      name: "ความสามารถทั่วไป (คณิตศาสตร์)",
      shortName: "คณิตศาสตร์",
      section: "A",
      sectionName: "ภาคความรู้ทั่วไป (ภาค ก)",
      quota: 20,
      easyCount: 10,
      hardCount: 10,
      sourceModules: ["01"]
    },
    {
      key: "thai",
      id: "02",
      name: "ภาษาไทย",
      shortName: "ภาษาไทย",
      section: "A",
      sectionName: "ภาคความรู้ทั่วไป (ภาค ก)",
      quota: 20,
      easyCount: 10,
      hardCount: 10,
      sourceModules: ["02"]
    },
    {
      key: "computer",
      id: "04",
      name: "เทคโนโลยีสารสนเทศ (คอมพิวเตอร์)",
      shortName: "คอมพิวเตอร์",
      section: "B",
      sectionName: "ภาคความรู้ความสามารถที่เหมาะสมกับตำแหน่ง (ภาค ข)",
      quota: 40,
      easyCount: 20,
      hardCount: 20,
      sourceModules: ["04"]
    },
    {
      key: "saraban",
      id: "06",
      name: "งานสารบรรณ",
      shortName: "งานสารบรรณ",
      section: "B",
      sectionName: "ภาคความรู้ความสามารถที่เหมาะสมกับตำแหน่ง (ภาค ข)",
      quota: 30,
      easyCount: 15,
      hardCount: 15,
      sourceModules: ["06", "07", "08"] // pooled across 06, 07, 08 as agreed
    },
    {
      key: "law",
      id: "05",
      name: "กฎหมายที่ประชาชนควรรู้",
      shortName: "กฎหมาย",
      section: "B",
      sectionName: "ภาคความรู้ความสามารถที่เหมาะสมกับตำแหน่ง (ภาค ข)",
      quota: 25,
      easyCount: 12,
      hardCount: 13,
      sourceModules: ["05"]
    },
    {
      key: "english",
      id: "03",
      name: "ภาษาอังกฤษ",
      shortName: "ภาษาอังกฤษ",
      section: "B",
      sectionName: "ภาคความรู้ความสามารถที่เหมาะสมกับตำแหน่ง (ภาค ข)",
      quota: 15,
      easyCount: 7,
      hardCount: 8,
      sourceModules: ["03"]
    }
  ],

  // Official Dual-Section Passing Criteria (ต้องผ่านไม่ต่ำกว่า 60% ของแต่ละภาค)
  MOCK_SECTIONS: {
    A: {
      key: "A",
      name: "ภาคความรู้ทั่วไป (ภาค ก)",
      shortName: "ภาค ก",
      totalQuestions: 40,
      minPassScore: 24, // 60% of 40
      subjectKeys: ["math", "thai"]
    },
    B: {
      key: "B",
      name: "ภาคความรู้ความสามารถที่เหมาะสมกับตำแหน่ง (ภาค ข)",
      shortName: "ภาค ข",
      totalQuestions: 110,
      minPassScore: 66, // 60% of 110
      subjectKeys: ["computer", "saraban", "law", "english"]
    }
  },

  dismissHint() {
    this.hintDismissed = true;
    try {
      localStorage.setItem("policeprep_exam_hint_dismissed", "true");
    } catch (e) {}
    const el = document.getElementById("exam-hint-caption");
    if (el) {
      el.style.display = "none";
    }
  },

  async init(container, params = null) {
    this.container = container;
    this.stopTimer();

    let requestedTab = null;
    let requestedSubject = null;
    let requestedSetId = null;

    if (params) {
      if (typeof params.get === "function") {
        requestedTab = params.get("tab");
        requestedSubject = params.get("subject");
        requestedSetId = params.get("setId");
      } else if (typeof params === "string") {
        requestedSubject = params;
      }
    }

    if (requestedSetId) {
      this.currentTab = "sets";
      await this.ensureAllExamSubjectsLoaded();
      await this.openSet(requestedSetId);
      return;
    }

    if (requestedSubject) {
      this.currentTab = "bank";
      this.currentSubjectId = requestedSubject;
      this.activeSetId = null;
      await this.startExam();
      return;
    }

    if (requestedTab === "bank") {
      this.currentTab = "bank";
      this.activeSetId = null;
      await this.startExam();
      return;
    }

    // Default: Tab 2 (ชุดข้อสอบเสมือนจริง 150 ข้อ)
    this.currentTab = "sets";
    this.activeSetId = null;
    await this.renderSetsHub();
  },

  async switchStudioTab(tab) {
    if (this.currentTab === tab && !this.activeSetId) return;
    this.stopTimer();
    this.currentTab = tab;
    this.activeSetId = null;
    this.activeSet = null;

    if (tab === "sets") {
      await this.renderSetsHub();
    } else {
      await this.startExam();
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  renderStudioHeader(subtitle = "") {
    return `
      <div class="exam-studio-header-bar">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="brand-badge" style="background: var(--accent); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 700;">PolicePrep®</span>
          <span style="font-size: var(--font-size-sm); font-weight: 700; color: var(--text-primary);">
            ${subtitle || (this.currentTab === 'sets' ? 'ระบบชุดข้อสอบเสมือนจริง (150 ข้อ)' : 'คลังข้อสอบรายวิชา (300 ข้อ)')}
          </span>
        </div>

        <div class="exam-studio-tabs">
          <button class="exam-studio-tab-btn ${this.currentTab === 'sets' ? 'active' : ''}" onclick="ExamEngine.switchStudioTab('sets')">
            ${Icons.exam()} <span>ชุดข้อสอบเสมือนจริง (150 ข้อ)</span>
          </button>
          <button class="exam-studio-tab-btn ${this.currentTab === 'bank' ? 'active' : ''}" onclick="ExamEngine.switchStudioTab('bank')">
            ${Icons.book()} <span>คลังข้อสอบรายวิชา (300 ข้อ)</span>
          </button>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     Mock Exam Sets (150 Questions) Management & Automatic Generation
     ========================================================================== */

  async ensureAllExamSubjectsLoaded() {
    if (this.allExamSubjectsData && this.allExamSubjectsData.length === 8 && this.questionMap.size >= 2400) {
      return this.allExamSubjectsData;
    }

    try {
      const results = await DataLoader.loadAllExamSubjects();
      this.allExamSubjectsData = results;
      this.questionMap.clear();

      results.forEach(sub => {
        const subId = sub.subject_id || sub.id;
        (sub.questions || []).forEach(q => {
          // Store with composite key: `${subId}::${q.id}`
          this.questionMap.set(`${subId}::${q.id}`, q);
          // Also set by bare q.id if not already taken
          if (!this.questionMap.has(q.id)) {
            this.questionMap.set(q.id, q);
          }
        });
      });

      return results;
    } catch (err) {
      console.error("Failed to load all exam subjects:", err);
      throw err;
    }
  },

  /**
   * Automatically calculate maximum possible mock sets from available database questions
   */
  calculateCapacity(allSubjectsData = null) {
    const data = allSubjectsData || this.allExamSubjectsData || [];
    if (!data || data.length === 0) {
      return {
        maxUniqueSets: 0,
        totalQuestionsAvailable: 0,
        bottlenecks: [],
        subjectCaps: []
      };
    }

    const subMap = new Map();
    data.forEach(sub => {
      const sId = sub.subject_id || sub.id;
      subMap.set(sId, sub.questions || []);
    });

    const subjectCaps = this.MOCK_SUBJECT_SPECS.map(spec => {
      let pool = [];
      spec.sourceModules.forEach(modId => {
        const qList = subMap.get(modId) || [];
        pool = pool.concat(qList);
      });

      const easyCount = pool.filter(q => q.difficulty_level <= 3).length;
      const hardCount = pool.filter(q => q.difficulty_level >= 4).length;

      const maxByTotal = Math.floor(pool.length / spec.quota);
      const maxByEasy = spec.easyCount > 0 ? Math.floor(easyCount / spec.easyCount) : maxByTotal;
      const maxByHard = spec.hardCount > 0 ? Math.floor(hardCount / spec.hardCount) : maxByTotal;
      const maxSets = maxByTotal; // Maximum unique sets supported by question pool without repetition

      return {
        key: spec.key,
        id: spec.id,
        name: spec.name,
        shortName: spec.shortName,
        section: spec.section,
        sectionName: spec.sectionName,
        quota: spec.quota,
        easyCount: spec.easyCount,
        hardCount: spec.hardCount,
        totalAvailable: pool.length,
        easyAvailable: easyCount,
        hardAvailable: hardCount,
        maxSets: Math.max(0, maxSets)
      };
    });

    const minSets = Math.min(...subjectCaps.map(c => c.maxSets));
    const maxUniqueSets = Math.max(0, isFinite(minSets) ? minSets : 0);
    const bottlenecks = subjectCaps.filter(c => c.maxSets === maxUniqueSets);
    const totalQuestionsAvailable = data.reduce((acc, s) => acc + (s.questions ? s.questions.length : 0), 0);

    return {
      maxUniqueSets,
      totalQuestionsAvailable,
      bottlenecks,
      subjectCaps
    };
  },

  getMockSetsData() {
    let data = ProgressStore.getMockSets();
    const needsRegeneration = !data || 
      !Array.isArray(data.sets) || 
      data.sets.length === 0 || 
      data.sets.some(s => s.totalQuestions !== 150);

    if (needsRegeneration) {
      data = this.generateInitialMockSets(5);
      ProgressStore.saveMockSets(data);
    }
    this.mockSetsData = data;
    return data;
  },

  saveMockSetsData(data) {
    this.mockSetsData = data;
    ProgressStore.saveMockSets(data);
  },

  generateInitialMockSets(count = 5) {
    if (!this.allExamSubjectsData) {
      return { sets: [] };
    }

    const sets = [];
    for (let i = 1; i <= count; i++) {
      const set = this.generateSingleMockSet(i, sets, this.allExamSubjectsData);
      sets.push(set);
    }
    return { sets };
  },

  generateSingleMockSet(setNum, otherSets, allSubjectsData) {
    const subMap = new Map();
    (allSubjectsData || []).forEach(sub => {
      const sId = sub.subject_id || sub.id;
      subMap.set(sId, sub.questions || []);
    });

    // 1. Gather all question IDs and usage frequency across other active sets
    const usageCountMap = new Map();
    const usedInOtherSets = new Set();
    (otherSets || []).forEach(s => {
      (s.questionIds || []).forEach(id => {
        usedInOtherSets.add(id);
        const bareId = id.includes("::") ? id.split("::")[1] : id;
        usedInOtherSets.add(bareId);
        usageCountMap.set(id, (usageCountMap.get(id) || 0) + 1);
        usageCountMap.set(bareId, (usageCountMap.get(bareId) || 0) + 1);
      });
    });

    const setQuestionIds = [];

    // 2. Loop over each of the 6 official subjects
    this.MOCK_SUBJECT_SPECS.forEach(spec => {
      let pool = [];
      spec.sourceModules.forEach(modId => {
        const qList = subMap.get(modId) || [];
        qList.forEach(q => {
          pool.push({
            ...q,
            _compositeKey: `${modId}::${q.id}`
          });
        });
      });

      const easyPool = pool.filter(q => q.difficulty_level <= 3);
      const hardPool = pool.filter(q => q.difficulty_level >= 4);

      // Filter questions not yet used in other sets
      let availEasy = easyPool.filter(q => !usedInOtherSets.has(q.id) && !usedInOtherSets.has(q._compositeKey));
      let availHard = hardPool.filter(q => !usedInOtherSets.has(q.id) && !usedInOtherSets.has(q._compositeKey));

      // Easy selection
      let pickedEasy = [];
      if (availEasy.length >= spec.easyCount) {
        pickedEasy = Utils.shuffleArray([...availEasy]).slice(0, spec.easyCount);
      } else {
        // Recycle using least-frequently-used questions
        pickedEasy = [...availEasy];
        const needed = spec.easyCount - pickedEasy.length;
        const alreadyPickedKeys = new Set(pickedEasy.map(q => q._compositeKey));
        const recyclableEasy = easyPool
          .filter(q => !alreadyPickedKeys.has(q._compositeKey))
          .sort((a, b) => {
            const freqA = usageCountMap.get(a._compositeKey) || usageCountMap.get(a.id) || 0;
            const freqB = usageCountMap.get(b._compositeKey) || usageCountMap.get(b.id) || 0;
            if (freqA !== freqB) return freqA - freqB;
            return Math.random() - 0.5;
          });
        pickedEasy = pickedEasy.concat(recyclableEasy.slice(0, needed));
      }

      // Hard selection
      let pickedHard = [];
      if (availHard.length >= spec.hardCount) {
        pickedHard = Utils.shuffleArray([...availHard]).slice(0, spec.hardCount);
      } else {
        // Recycle using least-frequently-used questions
        pickedHard = [...availHard];
        const needed = spec.hardCount - pickedHard.length;
        const alreadyPickedKeys = new Set(pickedHard.map(q => q._compositeKey));
        const recyclableHard = hardPool
          .filter(q => !alreadyPickedKeys.has(q._compositeKey))
          .sort((a, b) => {
            const freqA = usageCountMap.get(a._compositeKey) || usageCountMap.get(a.id) || 0;
            const freqB = usageCountMap.get(b._compositeKey) || usageCountMap.get(b.id) || 0;
            if (freqA !== freqB) return freqA - freqB;
            return Math.random() - 0.5;
          });
        pickedHard = pickedHard.concat(recyclableHard.slice(0, needed));
      }

      // Combine easy and hard for this subject and sort stably by id
      const combined = [...pickedEasy, ...pickedHard].sort((a, b) => a.id.localeCompare(b.id));

      combined.forEach(q => {
        setQuestionIds.push(q._compositeKey);
        usedInOtherSets.add(q._compositeKey);
        usedInOtherSets.add(q.id);
        usageCountMap.set(q._compositeKey, (usageCountMap.get(q._compositeKey) || 0) + 1);
        usageCountMap.set(q.id, (usageCountMap.get(q.id) || 0) + 1);
      });
    });

    return {
      id: `set_${setNum}`,
      setNumber: setNum,
      title: `ชุดข้อสอบเสมือนจริงที่ ${setNum}`,
      createdAt: Date.now(),
      hasStarted: false,
      isCompleted: false,
      totalQuestions: setQuestionIds.length, // exactly 150
      timeLimitMinutes: 180, // 3 hours realistic standard
      timeSpentSeconds: 0,
      lastActiveQuestionIndex: 0,
      userAnswers: {},
      flaggedQuestions: [],
      score: null,
      percentage: null,
      isPassed: null,
      sectionA: null,
      sectionB: null,
      submittedAt: null,
      moduleBreakdown: null,
      questionIds: setQuestionIds
    };
  },

  async renderSetsHub() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <p style="margin-top: 1rem;">กำลังเตรียมคลังชุดข้อสอบเสมือนจริง 150 ข้อ...</p>
      </div>
    `;

    try {
      await this.ensureAllExamSubjectsLoaded();
      const mockData = this.getMockSetsData();
      const sets = mockData.sets || [];
      const capacity = this.calculateCapacity(this.allExamSubjectsData);
      const settings = (typeof ProgressStore !== "undefined") ? ProgressStore.getSettings() : {};
      const allowRecycling = !!settings.allowRecycleMockSets;

      // Calculate overview stats
      const totalSets = sets.length;
      const completedSets = sets.filter(s => s.isCompleted);
      const inProgressSets = sets.filter(s => s.hasStarted && !s.isCompleted);
      const avgScore = completedSets.length > 0 
        ? Math.round(completedSets.reduce((acc, s) => acc + (s.percentage || 0), 0) / completedSets.length)
        : 0;

      let setsGridHtml = sets.map(set => {
        const isLocked = set.hasStarted || set.isCompleted;
        const answeredCount = Object.keys(set.userAnswers || {}).length;
        const isPass = !!set.isPassed;

        let statusBadge = "";
        let cardStatusCls = "unstarted";

        if (set.isCompleted) {
          cardStatusCls = "completed";
          statusBadge = `
            <span class="badge ${isPass ? 'badge-success' : 'badge-danger'}">
              ${isPass ? `${Icons.check()} ผ่านเกณฑ์ ตร.พฐ. (${set.score}/150 • ${set.percentage}%)` : `${Icons.close()} ไม่ผ่านเกณฑ์ (${set.score}/150 • ${set.percentage}%)`}
            </span>
          `;
        } else if (set.hasStarted) {
          cardStatusCls = "in-progress";
          statusBadge = `
            <span class="badge badge-warning">
              ${Icons.clock()} กำลังทำค้างอยู่ (${answeredCount}/150 ข้อ)
            </span>
          `;
        } else {
          statusBadge = `<span class="badge badge-default">ยังไม่เริ่มทำ</span>`;
        }

        return `
          <div class="mock-set-card ${cardStatusCls}">
            <div class="mock-set-header">
              <div>
                <h3 class="mock-set-title">${Utils.escapeHtml(set.title)}</h3>
                <div class="mock-set-meta-row" style="margin-top: 4px;">
                  <span>${Icons.exam()} 150 ข้อ</span>
                  <span>${Icons.clock()} 180 นาที (3 ชม.)</span>
                  <span>${Icons.sliders()} เกณฑ์ผ่าน 60% ทั้ง 2 ภาค</span>
                </div>
              </div>
              ${statusBadge}
            </div>

            <!-- 6 Subject Breakdown Pills -->
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">สัดส่วน 6 รายวิชาตามมาตรฐาน ตร.พฐ.:</div>
            <div class="mock-set-subjects-pills">
              ${this.MOCK_SUBJECT_SPECS.map(spec => `
                <span class="mock-sub-pill">
                  <span class="badge" style="font-size: 9px; padding: 0 4px; border-radius: 4px; background: var(--bg-surface);">${spec.section}</span>
                  ${spec.shortName} (${spec.quota})
                </span>
              `).join("")}
            </div>

            <!-- Section Passing Criteria Summary -->
            <div style="display: flex; gap: 8px; font-size: 11px; color: var(--text-secondary); background: var(--bg-subtle); padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
              <span><strong>ภาค ก:</strong> 40 ข้อ (ผ่าน >= 24)</span>
              <span style="opacity: 0.5;">•</span>
              <span><strong>ภาค ข:</strong> 110 ข้อ (ผ่าน >= 66)</span>
            </div>

            ${set.hasStarted && !set.isCompleted ? `
              <div class="mock-set-progress-box">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                  <span>ความคืบหน้าการตอบ</span>
                  <strong>${answeredCount} / 150 ข้อ (${Math.round((answeredCount / 150) * 100)}%)</strong>
                </div>
                <div class="exam-progress-bar-bg" style="height: 6px;">
                  <div class="exam-progress-bar-fill" style="width: ${(answeredCount / 150) * 100}%;"></div>
                </div>
              </div>
            ` : ''}

            ${set.isCompleted ? `
              <div class="mock-set-progress-box" style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="color: var(--text-secondary);">ผลการทดสอบแยกภาค:</span>
                  <strong>${isPass ? '<span style="color: var(--success);">ผ่านทั้ง 2 ภาค</span>' : '<span style="color: var(--danger);">ไม่ผ่านเกณฑ์</span>'}</strong>
                </div>
                <div style="display: flex; gap: 8px; font-size: 11px;">
                  <span class="badge ${set.sectionA && set.sectionA.isPassed ? 'badge-success' : 'badge-danger'}" style="font-size: 10px; padding: 1px 6px;">
                    ภาค ก: ${set.sectionA ? set.sectionA.score : 0}/40 (${set.sectionA && set.sectionA.isPassed ? 'ผ่าน' : 'ไม่ผ่าน'})
                  </span>
                  <span class="badge ${set.sectionB && set.sectionB.isPassed ? 'badge-success' : 'badge-danger'}" style="font-size: 10px; padding: 1px 6px;">
                    ภาค ข: ${set.sectionB ? set.sectionB.score : 0}/110 (${set.sectionB && set.sectionB.isPassed ? 'ผ่าน' : 'ไม่ผ่าน'})
                  </span>
                  <span style="margin-left: auto; color: var(--text-secondary); font-size: 11px;">
                    ${Utils.formatTime(set.timeSpentSeconds || 0)}
                  </span>
                </div>
              </div>
            ` : ''}

            <!-- Card Action Footer -->
            <div class="mock-set-actions">
              <!-- Shuffle Button (Permanently locked if started or completed) -->
              ${isLocked ? `
                <button class="btn btn-ghost btn-sm disabled" 
                        disabled 
                        title="ชุดข้อสอบนี้เริ่มทำหรือมีประวัติคะแนนแล้ว ไม่สามารถสุ่มข้อใหม่ได้ เพื่อป้องกันข้อมูลสูญหาย"
                        style="opacity: 0.5; cursor: not-allowed; display: inline-flex; align-items: center; gap: 4px;">
                  ${Icons.lock()} <span>สุ่มข้อใหม่ (ล็อค)</span>
                </button>
              ` : `
                <button class="btn btn-secondary btn-sm" 
                        onclick="ExamEngine.reshuffleSet('${set.id}')"
                        title="สุ่มข้อสอบ 150 ข้อใหม่สำหรับชุดนี้ตามโครงสร้าง 6 วิชา">
                  ${Icons.shuffle()} <span>สุ่มข้อใหม่</span>
                </button>
              `}

              <div style="display: flex; gap: var(--space-2);">
                ${set.isCompleted ? `
                  <button class="btn btn-outline btn-sm" onclick="ExamEngine.retakeSet('${set.id}')" title="ทำซ้ำชุดนี้ด้วย 150 ข้อเดิม">
                    ${Icons.repeat()} <span>ทำซ้ำ</span>
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="ExamEngine.openSet('${set.id}')">
                    ${Icons.eye()} <span>ดูเฉลยเชิงลึก</span>
                  </button>
                ` : (set.hasStarted ? `
                  <button class="btn btn-primary btn-sm" onclick="ExamEngine.openSet('${set.id}')">
                    <span>ทำต่อ</span> ${Icons.chevronRight()}
                  </button>
                ` : `
                  <button class="btn btn-primary btn-sm" onclick="ExamEngine.openSet('${set.id}')">
                    ${Icons.exam()} <span>เริ่มทำข้อสอบ</span>
                  </button>
                `)}
              </div>
            </div>
          </div>
        `;
      }).join("");

      const isCapReached = sets.length >= capacity.maxUniqueSets;
      const canCreateMore = !isCapReached || allowRecycling;

      this.container.innerHTML = `
        <div class="reader-container">
          <!-- 1. Header Bar with Segmented Studio Tabs -->
          ${this.renderStudioHeader("ระบบชุดข้อสอบเสมือนจริง (150 ข้อ)")}

          <!-- 2. Hero Information & KPI Banner -->
          <div class="mock-sets-hero">
            <h2 style="font-size: var(--font-size-xl); margin: 0 0 var(--space-2) 0; color: var(--text-primary);">
              ชุดข้อสอบเสมือนจริง 150 ข้อ (Mock Exam Simulation)
            </h2>
            <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: 0; line-height: 1.6;">
              ระบบรวม 6 หมวดวิชา รวม 150 ข้อ ตามมาตรฐานสนามสอบ ตร.พฐ. ตัวจริง 
              เวลาสอบ <strong>180 นาที (3 ชั่วโมง)</strong> โดยต้องผ่านเกณฑ์ <strong>ไม่ต่ำกว่า 60% ของแต่ละภาค</strong> 
              (ภาค ก: ความรู้ทั่วไป >= 24/40, ภาค ข: ความรู้ตามตำแหน่ง >= 66/110 และรวมคะแนนขั้นต่ำ >= 90/150)
            </p>

            <!-- Dynamic Auto-Calculated Capacity Card -->
            <div class="mock-capacity-card">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge badge-accent" style="font-weight: 700;">ระบบคำนวณอัตโนมัติ</span>
                  <span style="font-size: var(--font-size-sm); font-weight: 700; color: var(--text-primary);">
                    ความจุคลังข้อสอบปัจจุบัน: สร้างได้สูงสุด <strong>${capacity.maxUniqueSets} ชุด</strong> (ข้อสอบไม่ซ้ำกัน 100%)
                  </span>
                </div>
                <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">
                  คลังข้อสอบทั้งหมด ${capacity.totalQuestionsAvailable.toLocaleString()} ข้อ
                </div>
              </div>
              <div style="margin-top: 8px; font-size: var(--font-size-xs); color: var(--text-secondary); line-height: 1.5;">
                ${capacity.bottlenecks.length > 0 ? `
                  <strong>ขีดจำกัดความจุ:</strong> กำหนดโดยวิชา <em>${capacity.bottlenecks.map(b => `${b.name} (${b.totalAvailable} ข้อ / ชุดละ ${b.quota} ข้อ = ${b.maxSets} ชุด)`).join(", ")}</em> 
                  เมื่อคุณเพิ่มข้อสอบเข้าไปในไฟล์ระบบในอนาคต จำนวนชุดสูงสุดจะถูกคำนวณเพิ่มขึ้นทันทีโดยอัตโนมัติ
                ` : ''}
              </div>
            </div>

            <div class="mock-sets-kpis">
              <div class="mock-kpi-item">
                <span class="mock-kpi-label">ชุดข้อสอบในระบบ</span>
                <span class="mock-kpi-value">${totalSets} / ${capacity.maxUniqueSets} ชุด</span>
              </div>
              <div class="mock-kpi-item">
                <span class="mock-kpi-label">ชุดที่สอบเสร็จแล้ว</span>
                <span class="mock-kpi-value">${completedSets.length} ชุด</span>
              </div>
              <div class="mock-kpi-item">
                <span class="mock-kpi-label">กำลังทำค้างอยู่</span>
                <span class="mock-kpi-value">${inProgressSets.length} ชุด</span>
              </div>
              <div class="mock-kpi-item">
                <span class="mock-kpi-label">คะแนนเฉลี่ยภาพรวม</span>
                <span class="mock-kpi-value" style="color: ${avgScore >= 60 ? 'var(--success)' : 'var(--text-primary)'};">
                  ${completedSets.length > 0 ? `${avgScore}%` : '-'}
                </span>
              </div>
            </div>
          </div>

          <!-- 3. Action Toolbar -->
          <div class="mock-sets-toolbar">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span style="font-size: var(--font-size-sm); font-weight: 700;">
                รายการชุดข้อสอบทั้งหมด (${sets.length} / ${capacity.maxUniqueSets} ชุด)
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
              <button class="btn btn-outline btn-sm" onclick="ExamEngine.openResetAllSetsModal()" title="รีเซ็ตชุดข้อสอบจำลองทั้งหมด (มีหน้าต่างเตือนยืนยัน)">
                ${Icons.rotate()} <span>รีเซ็ตชุดข้อสอบทั้งหมด</span>
              </button>
              
              <button class="btn btn-primary btn-sm ${!canCreateMore ? 'disabled' : ''}" 
                      onclick="ExamEngine.createNewSet()" 
                      ${!canCreateMore ? 'disabled' : ''}
                      title="${!canCreateMore ? `สร้างครบ ${capacity.maxUniqueSets} ชุดตามความจุคลังที่ไม่ซ้ำแล้ว (เปิดหมุนเวียนซ้ำได้ในหน้าตั้งค่า)` : `สุ่มสร้างชุดข้อสอบ 150 ข้อชุดใหม่`}">
                ${Icons.plus()} <span>สร้างชุดข้อสอบใหม่ (${sets.length}/${capacity.maxUniqueSets})</span>
              </button>
            </div>
          </div>

          <!-- 4. Sets Grid -->
          <div class="mock-sets-grid">
            ${setsGridHtml}
          </div>
        </div>
      `;
    } catch (err) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">ไม่สามารถโหลดคลังชุดข้อสอบได้</div>
          <div class="empty-state-desc">${Utils.escapeHtml(err.message)}</div>
          <button class="btn btn-primary" onclick="ExamEngine.renderSetsHub()">ลองใหม่อีกครั้ง</button>
        </div>
      `;
    }
  },

  async createNewSet() {
    await this.ensureAllExamSubjectsLoaded();
    const mockData = this.getMockSetsData();
    const sets = mockData.sets || [];
    const capacity = this.calculateCapacity(this.allExamSubjectsData);
    const settings = (typeof ProgressStore !== "undefined") ? ProgressStore.getSettings() : {};
    const allowRecycling = !!settings.allowRecycleMockSets;

    if (sets.length >= capacity.maxUniqueSets && !allowRecycling) {
      Utils.showToast(
        `ขณะนี้สร้างครบขีดจำกัดสูงสุด ${capacity.maxUniqueSets} ชุด (ตามข้อสอบในระบบที่ไม่ซ้ำกัน) แล้ว หากต้องการสร้างเพิ่ม สามารถเปิดโหมดหมุนเวียนข้อสอบได้ในการตั้งค่า`,
        "warning"
      );
      return;
    }

    const nextNum = sets.length + 1;
    const newSet = this.generateSingleMockSet(nextNum, sets, this.allExamSubjectsData);
    sets.push(newSet);
    this.saveMockSetsData(mockData);

    Utils.showToast(`สร้างชุดข้อสอบเสมือนจริงที่ ${nextNum} เรียบร้อยแล้ว (150 ข้อ)`, "success");
    await this.renderSetsHub();
  },

  reshuffleSet(setId) {
    const mockData = this.getMockSetsData();
    const set = (mockData.sets || []).find(s => s.id === setId);
    if (!set) return;

    if (set.hasStarted || set.isCompleted) {
      Utils.showToast("ชุดข้อสอบนี้เริ่มทำหรือมีประวัติการสอบแล้ว ไม่สามารถสุ่มข้อใหม่ได้ เพื่อป้องกันข้อมูลสูญหาย", "warning");
      return;
    }

    const otherSets = (mockData.sets || []).filter(s => s.id !== setId);
    const newSet = this.generateSingleMockSet(set.setNumber, otherSets, this.allExamSubjectsData);
    set.questionIds = newSet.questionIds;
    set.createdAt = Date.now();

    this.saveMockSetsData(mockData);
    Utils.showToast(`สุ่มข้อสอบชุดที่ ${set.setNumber} ใหม่เรียบร้อยแล้ว (150 ข้อ)`, "success");
    this.renderSetsHub();
  },

  openResetAllSetsModal() {
    const modalHtml = `
      <div class="history-modal-overlay" id="reset-mock-sets-overlay" onclick="if(event.target === this) ExamEngine.closeResetMockSetsModal()">
        <div class="history-modal" role="dialog" aria-modal="true" style="max-width: 520px;">
          <div class="history-modal-header" style="border-bottom: 2px solid var(--danger);">
            <div style="display: flex; align-items: center; gap: 8px; color: var(--danger);">
              ${Icons.alertTriangle()}
              <h3 style="margin: 0; font-size: var(--font-size-md);">คำเตือน: ยืนยันการรีเซ็ตชุดข้อสอบทั้งหมด?</h3>
            </div>
            <button class="btn btn-ghost btn-icon-sm" onclick="ExamEngine.closeResetMockSetsModal()" aria-label="ปิด">
              ${Icons.close()}
            </button>
          </div>

          <div class="history-modal-body" style="padding: var(--space-6);">
            <p style="color: var(--text-primary); font-size: var(--font-size-sm); margin-bottom: var(--space-3); line-height: 1.6;">
              การดำเนินการนี้จะ <strong>ลบชุดข้อสอบเสมือนจริงทั้งหมด</strong> รวมถึงประวัติคำตอบและคะแนนสอบที่เคยบันทึกไว้ในชุดจำลองทุกชุด 
              และระบบจะทำการ <strong>สุ่มสร้างชุดข้อสอบมาตรฐาน 150 ข้อ ขึ้นมาใหม่จำนวน 5 ชุด</strong>
            </p>
            <div class="scenario-box" style="border-left-color: var(--danger); margin-bottom: 0;">
              <strong>ข้อควรระวัง:</strong> ข้อมูลชุดข้อสอบและสถิติคะแนนเดิมจะไม่สามารถกู้คืนได้ หากต้องการเริ่มใหม่กรุณากดยืนยันด้านล่าง
            </div>
          </div>

          <div style="padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border-light); display: flex; justify-content: flex-end; gap: var(--space-3); background-color: var(--bg-surface);">
            <button class="btn btn-secondary btn-sm" onclick="ExamEngine.closeResetMockSetsModal()">
              ยกเลิก
            </button>
            <button class="btn btn-danger btn-sm" onclick="ExamEngine.confirmResetAllSets()">
              ${Icons.trash()} ยืนยันรีเซ็ตชุดข้อสอบทั้งหมด
            </button>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById("reset-mock-sets-overlay");
    if (existing) existing.remove();
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  },

  closeResetMockSetsModal() {
    const el = document.getElementById("reset-mock-sets-overlay");
    if (el) el.remove();
  },

  async confirmResetAllSets() {
    this.closeResetMockSetsModal();
    ProgressStore.resetMockSets();
    this.mockSetsData = null;

    await this.ensureAllExamSubjectsLoaded();
    const freshData = this.generateInitialMockSets(5);
    this.saveMockSetsData(freshData);

    Utils.showToast("รีเซ็ตและสร้างชุดข้อสอบเสมือนจริง 1-5 เรียบร้อยแล้ว (150 ข้อ)", "success");
    await this.renderSetsHub();
  },

  /* ==========================================================================
     Active Set Test-Taking & Review Engine
     ========================================================================== */

  async openSet(setId, isRetake = false) {
    await this.ensureAllExamSubjectsLoaded();
    const mockData = this.getMockSetsData();
    const set = (mockData.sets || []).find(s => s.id === setId);
    if (!set) {
      Utils.showToast("ไม่พบชุดข้อสอบที่ระบุ", "error");
      await this.renderSetsHub();
      return;
    }

    this.activeSetId = setId;
    this.activeSet = set;

    // Resolve 150 question objects in order
    const resolvedQuestions = [];
    (set.questionIds || []).forEach(qRef => {
      let q = this.questionMap.get(qRef);
      if (!q && qRef.includes("::")) {
        q = this.questionMap.get(qRef.split("::")[1]);
      }
      if (q) resolvedQuestions.push(q);
    });

    if (resolvedQuestions.length === 0) {
      Utils.showToast("เกิดข้อผิดพลาดในการโหลดข้อสอบของชุดนี้", "error");
      await this.renderSetsHub();
      return;
    }

    this.questions = resolvedQuestions;

    // If completed and not retaking: render review view
    if (set.isCompleted && !isRetake) {
      this.userAnswers = { ...(set.userAnswers || {}) };
      this.isSubmitted = true;
      this.renderActiveSetReviewView();
      return;
    }

    // Set Taking Mode
    set.hasStarted = true;
    this.saveMockSetsData(mockData);

    this.currentIndex = set.lastActiveQuestionIndex || 0;
    this.userAnswers = { ...(set.userAnswers || {}) };
    this.flaggedQuestions = new Set(set.flaggedQuestions || []);
    this.showingExplanations.clear();
    this.isSubmitted = false;
    this.timeSpentSeconds = set.timeSpentSeconds || 0;

    const totalMins = set.timeLimitMinutes || 180;
    this.timerMinutes = totalMins;
    this.timerSeconds = Math.max(0, (totalMins * 60) - this.timeSpentSeconds);
    this.isTimed = true;

    this.startTimer();
    this.renderActiveSetQuizView();
    window.scrollTo({ top: 0, behavior: "auto" });
  },

  retakeSet(setId) {
    const mockData = this.getMockSetsData();
    const set = (mockData.sets || []).find(s => s.id === setId);
    if (!set) return;

    if (confirm(`คุณต้องการทำซ้ำ ${set.title} หรือไม่?\n\n(ระบบจะใช้ข้อสอบ 150 ข้อเดิมของชุดนี้ แต่จะล้างคำตอบและเวลาที่เคยทำ เพื่อให้คุณฝึกทำใหม่อีกครั้ง)`)) {
      set.userAnswers = {};
      set.hasStarted = false;
      set.isCompleted = false;
      set.score = null;
      set.percentage = null;
      set.isPassed = null;
      set.sectionA = null;
      set.sectionB = null;
      set.timeSpentSeconds = 0;
      set.submittedAt = null;
      set.moduleBreakdown = null;
      set.lastActiveQuestionIndex = 0;

      this.saveMockSetsData(mockData);
      this.openSet(setId, true);
    }
  },

  renderActiveSetQuizView() {
    if (!this.container) return;
    const set = this.activeSet;
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const totalInSet = this.questions.length;
    const qKey = `${q.subject_id}::${q.id}`;
    const isFlagged = this.flaggedQuestions.has(q.id) || this.flaggedQuestions.has(qKey);
    const selectedAnswer = this.userAnswers[qKey] || this.userAnswers[q.id];
    const isShowingExplanation = this.showingExplanations.has(q.id) || this.showingExplanations.has(qKey);
    const answeredCount = Object.keys(this.userAnswers).filter(k => !k.includes("::") || !this.userAnswers[k.split("::")[1]]).length;

    // Identify which of the 6 subjects this question belongs to in the set
    let activeSpec = null;
    let specStartIndex = 0;
    let specEndIndex = 0;
    let cursor = 0;
    const subjectRanges = [];

    this.MOCK_SUBJECT_SPECS.forEach(spec => {
      const start = cursor;
      const end = cursor + spec.quota - 1;
      subjectRanges.push({ spec, start, end });
      if (this.currentIndex >= start && this.currentIndex <= end) {
        activeSpec = spec;
        specStartIndex = start;
        specEndIndex = end;
      }
      cursor += spec.quota;
    });

    if (!activeSpec) {
      activeSpec = this.MOCK_SUBJECT_SPECS[0];
    }

    // Palette numbers (1 to 150)
    let paletteHtml = this.questions.map((item, idx) => {
      const isCur = idx === this.currentIndex;
      const itemKey = `${item.subject_id}::${item.id}`;
      const isAns = !!(this.userAnswers[itemKey] || this.userAnswers[item.id]);
      const isFlg = this.flaggedQuestions.has(item.id) || this.flaggedQuestions.has(itemKey);

      let cls = "palette-btn";
      if (isCur) cls += " active";
      else if (isAns) cls += " answered";
      if (isFlg) cls += " flagged";

      return `<button class="${cls}" onclick="ExamEngine.jumpTo(${idx})" title="ข้อที่ ${idx + 1} (${item.id})">${idx + 1}</button>`;
    }).join("");

    // Choices
    let optionsHtml = (q.options || []).map(opt => {
      const isSelected = selectedAnswer === opt.label;
      return `
        <div class="option-card ${isSelected ? 'selected' : ''}" onclick="ExamEngine.selectAnswerInSet('${q.id}', '${opt.label}')">
          <div class="option-label-circle">${opt.label}</div>
          <div class="option-text">${MathRenderer.formatMathString(Utils.escapeHtml(opt.text))}</div>
        </div>
      `;
    }).join("");

    this.container.innerHTML = `
      <div class="reader-container">
        <!-- Top Toolbar with Back Button, Title, Timer, and Submit -->
        <div class="exam-studio-header-bar" style="margin-bottom: var(--space-3);">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <button class="btn btn-secondary btn-sm" onclick="ExamEngine.returnToSetsHub()" title="บันทึกความคืบหน้าและกลับหน้ารวมชุด">
              ${Icons.arrowLeft()} <span>รวมชุด</span>
            </button>
            <div>
              <span class="badge badge-accent">${Utils.escapeHtml(set.title)}</span>
              <span style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-left: 6px;">
                ตอบแล้ว ${answeredCount} / ${totalInSet} ข้อ
              </span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div class="exam-timer" id="exam-timer-display">
              ${Utils.formatTime(this.timerSeconds)}
            </div>
            <button class="btn btn-primary btn-sm" onclick="ExamEngine.confirmSubmitActiveSet()">
              ${Icons.check()} <span>ส่งคำตอบ</span>
            </button>
          </div>
        </div>

        <!-- Sticky Subject Chips Bar for Quick Jumping Across 6 Subjects with Section Badges -->
        <div class="exam-subject-chips-bar" role="navigation" aria-label="ข้ามไปยังแต่ละวิชา">
          ${subjectRanges.map(({ spec, start, end }, sIdx) => {
            const isCurrentSub = this.currentIndex >= start && this.currentIndex <= end;

            let subAnswered = 0;
            for (let i = start; i <= end; i++) {
              const item = this.questions[i];
              if (item) {
                const itemKey = `${item.subject_id}::${item.id}`;
                if (this.userAnswers[itemKey] || this.userAnswers[item.id]) subAnswered++;
              }
            }

            return `
              <button class="subject-chip ${isCurrentSub ? 'active' : ''}" 
                      onclick="ExamEngine.jumpTo(${start})"
                      title="${spec.name} (${spec.sectionName} ข้อ ${start + 1}-${end + 1})">
                <span class="badge" style="font-size: 9px; padding: 1px 4px; border-radius: 4px; background: rgba(255,255,255,0.2);">${spec.section}</span>
                <span>${sIdx + 1}. ${spec.shortName}</span>
                <span class="chip-count">(${subAnswered}/${spec.quota})</span>
              </button>
            `;
          }).join("")}
        </div>

        <!-- Top Hint Caption for Eye Button -->
        ${!this.hintDismissed ? `
        <div class="exam-hint-caption" id="exam-hint-caption" role="note">
          <div style="display: flex; align-items: center; gap: var(--space-2); flex: 1;">
            ${Icons.eye()}
            <span>คำแนะนำ: สามารถแตะที่ปุ่มรูปดวงตา ในข้อสอบ เพื่อเปิดดูเฉลยและวิธีคิดเชิงลึกเฉพาะข้อนั้นได้ทันที</span>
          </div>
          <button type="button" class="exam-hint-close-btn" onclick="ExamEngine.dismissHint()" title="ปิดคำแนะนำ" aria-label="ปิดคำแนะนำ">
            ${Icons.close()}
          </button>
        </div>
        ` : ''}

        <!-- Question Status Bar -->
        <div class="exam-header-bar">
          <div>
            <span class="badge badge-accent">ข้อที่ ${this.currentIndex + 1} จาก 150</span>
            <span class="badge badge-default" style="margin-left: 4px;">
              [ภาค ${activeSpec.section}] ${Utils.escapeHtml(activeSpec.name)} (${(this.currentIndex - specStartIndex) + 1}/${activeSpec.quota})
            </span>
            <span class="badge ${q.difficulty_level <= 3 ? 'badge-success' : 'badge-danger'}" style="margin-left: 4px;">
              ${q.difficulty_level <= 3 ? 'ง่าย (ระดับ ' + q.difficulty_level + ')' : 'ยาก (ระดับ ' + q.difficulty_level + ')'}
            </span>
            <span style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-left: 6px;">
              ${Utils.escapeHtml(q.topic || "")}
            </span>
          </div>

          <button class="btn btn-secondary btn-sm" onclick="ExamEngine.toggleFlagInSet('${q.id}')" style="display: flex; align-items: center; gap: 4px;">
            ${Icons.flag("", isFlagged)} <span>${isFlagged ? 'ยกเลิกมาร์ก' : 'มาร์กทบทวน'}</span>
          </button>
        </div>

        <!-- Question Palette (150 Questions) -->
        <div class="question-palette">
          ${paletteHtml}
        </div>

        <!-- Main Question Card -->
        <div class="question-card" id="active-question-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
            <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">
              รหัสข้อสอบ: <strong>${q.id}</strong> | ${Utils.escapeHtml(q.question_pattern || "")}
            </div>

            <!-- Eye Icon Button strictly with NO text label -->
            <button class="btn btn-secondary btn-icon-only eye-btn ${isShowingExplanation ? 'active' : ''}" 
                    id="eye-btn-${q.id}" 
                    onclick="ExamEngine.toggleQuestionExplanation('${q.id}')" 
                    title="เปิดดูเฉลยละเอียดของข้อนี้" 
                    aria-label="ดูเฉลย">
              ${isShowingExplanation ? Icons.eyeOff() : Icons.eye()}
            </button>
          </div>

          ${q.scenario ? `
            <div class="scenario-box">
              <strong>บริบท/สถานการณ์:</strong><br>
              ${MathRenderer.formatMathString(Utils.escapeHtml(q.scenario))}
            </div>
          ` : ''}

          <div class="question-text">
            ${this.currentIndex + 1}. ${MathRenderer.formatMathString(Utils.escapeHtml(q.question))}
          </div>

          <div class="options-list">
            ${optionsHtml}
          </div>

          <!-- Inline Explanation Revealed by Eye Button -->
          ${isShowingExplanation ? `
            <div class="inline-explanation-wrapper" id="inline-explanation-${q.id}">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
                <span style="font-weight: 700; color: var(--accent); font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px;">
                  ${Icons.eye()} เฉลยและวิธีคิดเชิงลึกเฉพาะข้อนี้
                </span>
                <button class="btn btn-ghost btn-sm" onclick="ExamEngine.toggleQuestionExplanation('${q.id}')" style="font-size: 11px;">
                  ปิดเฉลยข้อนี้
                </button>
              </div>
              ${ExplanationRenderer.renderExplanation(q, false)}
            </div>
          ` : ''}

          <!-- Bottom Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: var(--space-4); margin-top: var(--space-4);">
            <button class="btn btn-secondary" onclick="ExamEngine.prevQuestion()" ${this.currentIndex <= 0 ? 'disabled' : ''}>
              ${Icons.chevronLeft()} ข้อก่อนหน้า
            </button>

            ${this.currentIndex === totalInSet - 1 ? `
              <button class="btn btn-primary" onclick="ExamEngine.confirmSubmitActiveSet()">
                ${Icons.check()} ส่งคำตอบตรวจคะแนน (150 ข้อ)
              </button>
            ` : `
              <button class="btn btn-primary" onclick="ExamEngine.nextQuestion()">
                ข้อถัดไป ${Icons.chevronRight()}
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    if (typeof document !== "undefined") {
      const activeCard = document.getElementById("active-question-card");
      if (activeCard) {
        MathRenderer.renderElement(activeCard);
      }
    }
  },

  selectAnswerInSet(qId, label) {
    if (this.isSubmitted) return;
    this.userAnswers[qId] = label;

    const q = this.questions[this.currentIndex] || this.questionMap.get(qId);
    if (q) {
      const qKey = `${q.subject_id}::${q.id}`;
      this.userAnswers[qKey] = label;
    }
    const isCorrect = q ? (q.correct_answer === label) : false;
    const subId = q ? (q.subject_id || q.id.slice(0, 2)) : "01";

    // Record question answer in persistent progress store
    ProgressStore.recordQuestionAnswer(subId, q ? q.id : qId, label, isCorrect);

    // Save set state
    if (this.activeSet) {
      this.activeSet.userAnswers = { ...this.userAnswers };
      this.activeSet.lastActiveQuestionIndex = this.currentIndex;
      this.activeSet.timeSpentSeconds = this.timeSpentSeconds;
      this.saveMockSetsData(this.mockSetsData);
    }

    this.renderActiveSetQuizView();
  },

  toggleFlagInSet(qId) {
    const q = this.questions[this.currentIndex] || this.questionMap.get(qId);
    const qKey = q ? `${q.subject_id}::${q.id}` : qId;

    if (this.flaggedQuestions.has(qId) || this.flaggedQuestions.has(qKey)) {
      this.flaggedQuestions.delete(qId);
      this.flaggedQuestions.delete(qKey);
    } else {
      this.flaggedQuestions.add(qId);
      if (qKey) this.flaggedQuestions.add(qKey);
    }
    if (this.activeSet) {
      this.activeSet.flaggedQuestions = Array.from(this.flaggedQuestions);
      this.saveMockSetsData(this.mockSetsData);
    }
    this.renderActiveSetQuizView();
  },

  returnToSetsHub() {
    this.stopTimer();
    if (this.activeSet && !this.activeSet.isCompleted) {
      this.activeSet.lastActiveQuestionIndex = this.currentIndex;
      this.activeSet.timeSpentSeconds = this.timeSpentSeconds;
      this.activeSet.userAnswers = { ...this.userAnswers };
      this.saveMockSetsData(this.mockSetsData);
      Utils.showToast("บันทึกความคืบหน้าเรียบร้อยแล้ว สามารถกลับมาทำต่อได้ตลอดเวลา", "info");
    }
    this.activeSetId = null;
    this.activeSet = null;
    this.renderSetsHub();
  },

  confirmSubmitActiveSet() {
    const answeredCount = Object.keys(this.userAnswers).filter(k => !k.includes("::") || !this.userAnswers[k.split("::")[1]]).length;
    const total = this.questions.length;
    const unanswered = Math.max(0, total - answeredCount);

    let msg = `คุณทำข้อสอบไปแล้ว ${answeredCount} จาก ${total} ข้อ`;
    if (unanswered > 0) {
      msg += `\n(ยังมีข้อที่ยังไม่ได้ตอบอีก ${unanswered} ข้อ)`;
    }
    msg += "\n\nคุณต้องการยืนยันการส่งคำตอบเพื่อตรวจคะแนนตามเกณฑ์ ตร.พฐ. (ผ่าน 60% ทั้ง 2 ภาค) หรือไม่?";

    if (confirm(msg)) {
      this.submitActiveSet(false);
    }
  },

  submitActiveSet(isAuto = false) {
    this.stopTimer();
    this.isSubmitted = true;

    let totalScore = 0;
    const breakdown = {};
    let cursor = 0;

    // 1. Calculate score for each of the 6 official subjects
    this.MOCK_SUBJECT_SPECS.forEach(spec => {
      const startQ = cursor;
      const endQ = cursor + spec.quota - 1;
      cursor += spec.quota;

      let subScore = 0;
      for (let i = startQ; i <= endQ; i++) {
        const q = this.questions[i];
        if (q) {
          const userAns = this.userAnswers[`${q.subject_id}::${q.id}`] || this.userAnswers[q.id];
          if (userAns === q.correct_answer) {
            subScore++;
            totalScore++;
          }
        }
      }

      breakdown[spec.key] = {
        key: spec.key,
        id: spec.id,
        name: spec.name,
        shortName: spec.shortName,
        section: spec.section,
        sectionName: spec.sectionName,
        score: subScore,
        total: spec.quota,
        percentage: Math.round((subScore / spec.quota) * 100),
        isPassed: (subScore / spec.quota) >= 0.6,
        startIndex: startQ,
        endIndex: endQ
      };
    });

    // 2. Section A: ความรู้ทั่วไป (คณิตศาสตร์ + ภาษาไทย = 40 ข้อ, เกณฑ์ผ่าน >= 24)
    const mathScore = breakdown.math ? breakdown.math.score : 0;
    const thaiScore = breakdown.thai ? breakdown.thai.score : 0;
    const sectionAScore = mathScore + thaiScore;
    const sectionAPercent = Math.round((sectionAScore / 40) * 100);
    const sectionAPassed = sectionAScore >= 24;

    // 3. Section B: ความรู้ความสามารถตามตำแหน่ง (IT + สารบรรณ + กฎหมาย + ภาษาอังกฤษ = 110 ข้อ, เกณฑ์ผ่าน >= 66)
    const compScore = breakdown.computer ? breakdown.computer.score : 0;
    const sarabanScore = breakdown.saraban ? breakdown.saraban.score : 0;
    const lawScore = breakdown.law ? breakdown.law.score : 0;
    const engScore = breakdown.english ? breakdown.english.score : 0;
    const sectionBScore = compScore + sarabanScore + lawScore + engScore;
    const sectionBPercent = Math.round((sectionBScore / 110) * 100);
    const sectionBPassed = sectionBScore >= 66;

    // 4. Overall Passing Criteria: Must pass BOTH Section A (>= 24) AND Section B (>= 66), total >= 90
    const totalPercent = Math.round((totalScore / 150) * 100);
    const overallPassed = sectionAPassed && sectionBPassed && (totalScore >= 90);

    const sectionAData = {
      key: "A",
      name: "ภาคความรู้ทั่วไป (ภาค ก)",
      shortName: "ภาค ก",
      score: sectionAScore,
      total: 40,
      minPassScore: 24,
      percentage: sectionAPercent,
      isPassed: sectionAPassed,
      passed: sectionAPassed,
      details: `คณิตศาสตร์ (${mathScore}/20) + ภาษาไทย (${thaiScore}/20)`
    };

    const sectionBData = {
      key: "B",
      name: "ภาคความรู้ความสามารถที่เหมาะสมกับตำแหน่ง (ภาค ข)",
      shortName: "ภาค ข",
      score: sectionBScore,
      total: 110,
      minPassScore: 66,
      percentage: sectionBPercent,
      isPassed: sectionBPassed,
      passed: sectionBPassed,
      details: `คอมพิวเตอร์ (${compScore}/40) + งานสารบรรณ (${sarabanScore}/30) + กฎหมาย (${lawScore}/25) + ภาษาอังกฤษ (${engScore}/15)`
    };

    // Update active set record
    if (this.activeSet) {
      this.activeSet.isCompleted = true;
      this.activeSet.score = totalScore;
      this.activeSet.percentage = totalPercent;
      this.activeSet.isPassed = overallPassed;
      this.activeSet.passed = overallPassed;
      this.activeSet.sectionA = sectionAData;
      this.activeSet.sectionB = sectionBData;
      this.activeSet.timeSpentSeconds = this.timeSpentSeconds;
      this.activeSet.submittedAt = Date.now();
      this.activeSet.moduleBreakdown = breakdown;
      this.saveMockSetsData(this.mockSetsData);

      // Save to general exam history
      ProgressStore.saveExamAttempt({
        subjectId: `mock_${this.activeSet.id}`,
        subjectName: this.activeSet.title,
        score: totalScore,
        total: 150,
        percentage: totalPercent,
        timeSpent: this.timeSpentSeconds,
        wrongCount: 150 - totalScore,
        difficulty: "balanced",
        isRandomized: true,
        isPassed: overallPassed,
        sectionA: sectionAData,
        sectionB: sectionBData
      });
    }

    this.renderActiveSetReviewView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  renderActiveSetReviewView() {
    if (!this.container) return;
    const set = this.activeSet;
    const total = this.questions.length;
    let score = set.score !== null ? set.score : 0;
    let percent = set.percentage !== null ? set.percentage : Math.round((score / total) * 100);
    const isPass = !!set.isPassed;
    const breakdown = set.moduleBreakdown || {};
    const sectionA = set.sectionA || { score: 0, total: 40, percentage: 0, isPassed: false, details: "" };
    const sectionB = set.sectionB || { score: 0, total: 110, percentage: 0, isPassed: false, details: "" };

    let displayQuestions = this.questions;
    if (this.filterReviewWrongOnly) {
      displayQuestions = this.questions.filter(q => {
        const uAns = this.userAnswers[`${q.subject_id}::${q.id}`] || this.userAnswers[q.id];
        return uAns !== q.correct_answer;
      });
    }

    this.container.innerHTML = `
      <div class="reader-container">
        <!-- Top Navigation -->
        <div class="exam-studio-header-bar">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <button class="btn btn-secondary btn-sm" onclick="ExamEngine.returnToSetsHub()">
              ${Icons.arrowLeft()} <span>กลับหน้ารวมชุดข้อสอบ</span>
            </button>
            <span class="badge badge-accent">${Utils.escapeHtml(set.title)}</span>
          </div>

          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <button class="btn btn-outline btn-sm" onclick="ExamEngine.retakeSet('${set.id}')">
              ${Icons.repeat()} <span>ทำซ้ำชุดนี้</span>
            </button>
          </div>
        </div>

        <!-- Score Summary Card -->
        <div class="card" style="text-align: center; padding: var(--space-8); margin-bottom: var(--space-6); border-top: 4px solid ${isPass ? 'var(--success)' : 'var(--danger)'};">
          <span class="badge ${isPass ? 'badge-success' : 'badge-danger'}" style="font-size: var(--font-size-sm); padding: 4px 14px; margin-bottom: var(--space-2);">
            ${isPass ? `${Icons.check()} ผ่านเกณฑ์การสอบคัดเลือก ตร.พฐ. (ผ่านทั้ง 2 ภาค >= 60%)` : `${Icons.close()} ไม่ผ่านเกณฑ์การสอบคัดเลือก (ต่ำกว่า 60% ในภาคที่กำหนด)`}
          </span>

          <h2 style="font-size: var(--font-size-2xl); margin: var(--space-2) 0;">${score} / ${total} คะแนน (${percent}%)</h2>
          
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4); font-size: var(--font-size-sm);">
            เกณฑ์ขั้นต่ำรวม: 90 / 150 คะแนน • ใช้เวลาสอบไป ${Utils.formatTime(set.timeSpentSeconds || 0)} • ตอบถูก: <span style="color: var(--success); font-weight: 700;">${score} ข้อ</span> • ตอบผิด/ไม่ตอบ: <span style="color: var(--danger); font-weight: 700;">${total - score} ข้อ</span>
          </p>

          <!-- Dual-Section Performance Cards -->
          <div class="mock-dual-section-grid">
            <!-- Section A Card -->
            <div class="mock-dual-section-card ${sectionA.isPassed ? 'passed' : 'failed'}">
              <div class="mock-section-header">
                <div>
                  <h4 class="mock-section-title">ภาคความรู้ทั่วไป (ภาค ก)</h4>
                  <div class="mock-section-subtitle">คณิตศาสตร์ (20) + ภาษาไทย (20)</div>
                </div>
                <span class="badge ${sectionA.isPassed ? 'badge-success' : 'badge-danger'}">
                  ${sectionA.isPassed ? `${Icons.check()} ผ่านเกณฑ์` : `${Icons.close()} ไม่ผ่าน`}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-size: var(--font-size-xl); font-weight: 700; color: ${sectionA.isPassed ? 'var(--success)' : 'var(--danger)'};">
                  ${sectionA.score} / 40 คะแนน
                </span>
                <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">
                  เกณฑ์ขั้นต่ำ: 24 คะแนน (${sectionA.percentage}%)
                </span>
              </div>
              <div class="exam-progress-bar-bg" style="height: 6px;">
                <div class="exam-progress-bar-fill" style="width: ${sectionA.percentage}%; background-color: ${sectionA.isPassed ? 'var(--success)' : 'var(--danger)'};"></div>
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                ${sectionA.details}
              </div>
            </div>

            <!-- Section B Card -->
            <div class="mock-dual-section-card ${sectionB.isPassed ? 'passed' : 'failed'}">
              <div class="mock-section-header">
                <div>
                  <h4 class="mock-section-title">ภาคความรู้ความสามารถตามตำแหน่ง (ภาค ข)</h4>
                  <div class="mock-section-subtitle">คอมพิวเตอร์ (40) + สารบรรณ (30) + กฎหมาย (25) + อังกฤษ (15)</div>
                </div>
                <span class="badge ${sectionB.isPassed ? 'badge-success' : 'badge-danger'}">
                  ${sectionB.isPassed ? `${Icons.check()} ผ่านเกณฑ์` : `${Icons.close()} ไม่ผ่าน`}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-size: var(--font-size-xl); font-weight: 700; color: ${sectionB.isPassed ? 'var(--success)' : 'var(--danger)'};">
                  ${sectionB.score} / 110 คะแนน
                </span>
                <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">
                  เกณฑ์ขั้นต่ำ: 66 คะแนน (${sectionB.percentage}%)
                </span>
              </div>
              <div class="exam-progress-bar-bg" style="height: 6px;">
                <div class="exam-progress-bar-fill" style="width: ${sectionB.percentage}%; background-color: ${sectionB.isPassed ? 'var(--success)' : 'var(--danger)'};"></div>
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                ${sectionB.details}
              </div>
            </div>
          </div>

          ${!isPass ? `
            <div class="scenario-box" style="border-left-color: var(--danger); text-align: left; margin: 0 auto var(--space-4); max-width: 650px;">
              <strong>ข้อสังเกตผลการสอบ:</strong> ${
                !sectionA.isPassed && !sectionB.isPassed
                  ? `คุณไม่ผ่านเกณฑ์ทั้ง 2 ภาค (ภาค ก ขาดอีก ${24 - sectionA.score} คะแนน, ภาค ข ขาดอีก ${66 - sectionB.score} คะแนน)`
                  : (!sectionA.isPassed
                    ? `คุณไม่ผ่านภาค ก (ได้ ${sectionA.score}/40 ขาดอีก ${24 - sectionA.score} คะแนนเพื่อให้ได้ 24 คะแนน)`
                    : `คุณไม่ผ่านภาค ข (ได้ ${sectionB.score}/110 ขาดอีก ${66 - sectionB.score} คะแนนเพื่อให้ได้ 66 คะแนน)`)
              }
            </div>
          ` : ''}

          <div style="display: flex; justify-content: center; gap: var(--space-3); flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="ExamEngine.toggleFilterWrongInSet()">
              ${this.filterReviewWrongOnly ? 'แสดงข้อสอบทั้งหมด (150 ข้อ)' : `ดูเฉพาะข้อที่ตอบผิด (${total - score} ข้อ)`}
            </button>
            <button class="btn btn-outline btn-sm" onclick="ExamEngine.retakeSet('${set.id}')">
              ${Icons.repeat()} ทำซ้ำชุดนี้ใหม่อีกครั้ง
            </button>
            <button class="btn btn-primary btn-sm" onclick="ExamEngine.returnToSetsHub()">
              ${Icons.arrowLeft()} กลับหน้ารวมชุด
            </button>
          </div>
        </div>

        <!-- 6-Subject Score Breakdown Grid -->
        <h3 style="margin-bottom: var(--space-3); font-size: var(--font-size-md); display: flex; align-items: center; gap: 6px;">
          ${Icons.layers()} ผลคะแนนแยกตาม 6 รายวิชา
        </h3>

        <div class="mock-breakdown-grid">
          ${this.MOCK_SUBJECT_SPECS.map(spec => {
            const b = breakdown[spec.key] || { score: 0, total: spec.quota, percentage: 0 };
            const subPass = b.percentage >= 60;

            return `
              <div class="mock-breakdown-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <span class="badge" style="font-size: 9px; padding: 1px 4px; border-radius: 4px; background: var(--bg-subtle);">${spec.section}</span>
                    <strong style="font-size: var(--font-size-sm); color: var(--text-primary); margin-left: 2px;">${spec.name}</strong>
                  </div>
                  <span class="badge ${subPass ? 'badge-success' : 'badge-danger'}" style="font-size: 10px; padding: 1px 6px;">
                    ${subPass ? 'ผ่าน (>=60%)' : 'ไม่ผ่าน'}
                  </span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
                  <span style="font-size: var(--font-size-lg); font-weight: 700; color: ${subPass ? 'var(--success)' : 'var(--danger)'};">
                    ${b.score} / ${spec.quota} ข้อ
                  </span>
                  <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">
                    ${b.percentage}%
                  </span>
                </div>

                <div class="exam-progress-bar-bg" style="height: 6px; margin-top: 2px;">
                  <div class="exam-progress-bar-fill" style="width: ${b.percentage}%; background-color: ${subPass ? 'var(--success)' : 'var(--danger)'};"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <!-- Deep Review List -->
        <h3 style="margin: var(--space-6) 0 var(--space-4) 0; font-size: var(--font-size-md);">
          เฉลยละเอียดและวิเคราะห์เชิงลึก (${displayQuestions.length} ข้อ)
        </h3>

        <div style="display: flex; flex-direction: column; gap: var(--space-6);">
          ${displayQuestions.map((q) => {
            const userAns = this.userAnswers[`${q.subject_id}::${q.id}`] || this.userAnswers[q.id];
            const isCorrect = userAns === q.correct_answer;
            const originalIndex = this.questions.findIndex(item => item.id === q.id) + 1;
            
            // Find spec
            const spec = this.MOCK_SUBJECT_SPECS.find(s => s.sourceModules.includes(q.subject_id)) || { shortName: q.subject_name || "", section: "ข" };

            return `
              <div class="card" style="border-left: 4px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2);">
                  <div style="display: flex; align-items: center; gap: var(--space-2);">
                    <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}">ข้อ ${originalIndex}</span>
                    <span class="badge badge-default">[ภาค ${spec.section}] ${spec.shortName}</span>
                    <span style="font-weight: 600; font-size: var(--font-size-xs); color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">
                      ${isCorrect ? 'ตอบถูกต้อง (+1)' : 'ตอบผิด (0)'}
                    </span>
                  </div>
                  <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">
                    คำตอบของคุณ: <strong>${userAns || 'ไม่ได้ตอบ'}</strong> | เฉลยที่ถูกต้อง: <strong style="color: var(--success);">${q.correct_answer}</strong>
                  </span>
                </div>

                ${q.scenario ? `
                  <div class="scenario-box">
                    <strong>สถานการณ์:</strong> ${MathRenderer.formatMathString(Utils.escapeHtml(q.scenario))}
                  </div>
                ` : ''}

                <div style="font-weight: 600; margin-bottom: var(--space-4);">
                  ${MathRenderer.formatMathString(Utils.escapeHtml(q.question))}
                </div>

                <!-- 4 Options Review -->
                <div class="options-list" style="margin-bottom: var(--space-4);">
                  ${q.options.map(opt => {
                    const isUserPick = userAns === opt.label;
                    const isRightPick = q.correct_answer === opt.label;
                    let optClass = "option-card";
                    if (isRightPick) optClass += " correct";
                    else if (isUserPick) optClass += " incorrect";

                    return `
                      <div class="${optClass}" style="cursor: default;">
                        <div class="option-label-circle">${opt.label}</div>
                        <div class="option-text">
                          ${MathRenderer.formatMathString(Utils.escapeHtml(opt.text))}
                          ${isRightPick ? ' <span class="badge badge-success" style="margin-left: 6px;">คำตอบที่ถูกต้อง</span>' : ''}
                          ${isUserPick && !isRightPick ? ' <span class="badge badge-danger" style="margin-left: 6px;">คำตอบที่คุณเลือก</span>' : ''}
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>

                <!-- Deep 9-Section Explanation Box -->
                ${ExplanationRenderer.renderExplanation(q, true)}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    if (typeof document !== "undefined") {
      MathRenderer.renderElement(this.container);
    }
  },

  toggleFilterWrongInSet() {
    this.filterReviewWrongOnly = !this.filterReviewWrongOnly;
    this.renderActiveSetReviewView();
  },

  /* ==========================================================================
     Single-Subject Practice Bank (300 Questions) Engine
     ========================================================================== */

  async startExam() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <p style="margin-top: 1rem;">กำลังโหลดคลังข้อสอบ 300 ข้อ...</p>
      </div>
    `;

    try {
      const data = await DataLoader.loadExamSubject(this.currentSubjectId);
      this.examData = data;
      this.allQuestions = [...data.questions];
      
      this.filterAndPrepareQuestions();

      const settings = ProgressStore.getSettings();
      const mins = this.timerMinutes || settings.timerMinutes || 60;
      this.timerMinutes = mins;
      this.timerSeconds = mins * 60;
      this.timeSpentSeconds = 0;

      if (this.isTimed) {
        this.startTimer();
      }

      this.render();
    } catch (err) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">ไม่สามารถโหลดชุดข้อสอบได้</div>
          <div class="empty-state-desc">${Utils.escapeHtml(err.message)}</div>
          <button class="btn btn-primary" onclick="ExamEngine.init(ExamEngine.container, ExamEngine.currentSubjectId)">ลองใหม่อีกครั้ง</button>
        </div>
      `;
    }
  },

  filterAndPrepareQuestions() {
    let pool = [...this.allQuestions];

    // 1. Difficulty filter (ง่าย vs ยาก)
    if (this.difficultyFilter === "easy") {
      pool = pool.filter(q => q.difficulty_level <= 3);
    } else if (this.difficultyFilter === "hard") {
      pool = pool.filter(q => q.difficulty_level >= 4);
    }

    // 2. Randomization mode (สุ่มข้อ)
    if (this.isRandomized) {
      pool = Utils.shuffleArray([...pool]);
    }

    // 3. Session slice
    if (this.sessionCount !== "all") {
      const count = parseInt(this.sessionCount, 10);
      if (!isNaN(count) && count > 0) {
        pool = pool.slice(0, count);
      }
    }

    this.questions = pool;
    this.currentIndex = 0;
  },

  setDifficulty(diff) {
    if (this.difficultyFilter === diff) return;
    this.difficultyFilter = diff;
    this.filterAndPrepareQuestions();
    this.userAnswers = {};
    this.showingExplanations.clear();
    this.render();
  },

  toggleRandomize() {
    this.isRandomized = !this.isRandomized;
    this.filterAndPrepareQuestions();
    this.userAnswers = {};
    this.showingExplanations.clear();
    Utils.showToast(this.isRandomized ? "เปิดโหมดสุ่มข้อสอบแล้ว" : "เปลี่ยนเป็นโหมดเรียงตามข้อ", "info");
    this.render();
  },

  setSessionCount(count) {
    this.sessionCount = count;
    this.filterAndPrepareQuestions();
    this.userAnswers = {};
    this.showingExplanations.clear();
    this.render();
  },

  setCustomTimerMinutes(val) {
    const mins = parseInt(val, 10);
    if (!isNaN(mins) && mins > 0) {
      this.timerMinutes = mins;
      this.timerSeconds = mins * 60;
      this.updateTimerDisplay();
      Utils.showToast(`ตั้งเวลาสอบเป็น ${mins} นาทีเรียบร้อยแล้ว`, "success");
    }
  },

  toggleTimerMode() {
    this.isTimed = !this.isTimed;
    if (this.isTimed) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
    if (this.activeSetId) {
      this.renderActiveSetQuizView();
    } else {
      this.render();
    }
  },

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.isSubmitted) {
        this.stopTimer();
        return;
      }
      this.timeSpentSeconds++;
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.updateTimerDisplay();
        if (this.timerSeconds <= 0) {
          this.stopTimer();
          Utils.showToast("หมดเวลาสอบ! กำลังส่งคำตอบอัตโนมัติ", "warning");
          if (this.activeSetId) {
            this.submitActiveSet(true);
          } else {
            this.submitExam(true);
          }
        }
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  updateTimerDisplay() {
    if (typeof document === "undefined") return;
    const el = document.getElementById("exam-timer-display");
    if (el) {
      el.textContent = Utils.formatTime(this.timerSeconds);
      if (el.classList) {
        if (this.timerSeconds <= 300) { // 5 minutes left
          el.classList.add("urgent");
        } else {
          el.classList.remove("urgent");
        }
      }
    }
  },

  toggleQuestionExplanation(qId) {
    if (this.showingExplanations.has(qId)) {
      this.showingExplanations.delete(qId);
    } else {
      this.showingExplanations.add(qId);
    }
    if (this.activeSetId) {
      this.renderActiveSetQuizView();
    } else {
      this.render();
    }
  },

  selectAnswer(qId, label) {
    if (this.isSubmitted) return;
    this.userAnswers[qId] = label;

    // Find question and verify correctness
    const q = this.questions.find(item => item.id === qId) || this.allQuestions.find(item => item.id === qId);
    const isCorrect = q ? (q.correct_answer === label) : false;

    // Save to persistent Question Progress Store
    ProgressStore.recordQuestionAnswer(this.currentSubjectId, qId, label, isCorrect);

    this.render();
  },

  toggleFlag(qId) {
    if (this.flaggedQuestions.has(qId)) {
      this.flaggedQuestions.delete(qId);
    } else {
      this.flaggedQuestions.add(qId);
    }
    this.render();
  },

  jumpTo(index) {
    this.currentIndex = index;
    if (this.activeSetId) {
      this.renderActiveSetQuizView();
    } else {
      this.render();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      if (this.activeSetId) {
        this.renderActiveSetQuizView();
      } else {
        this.render();
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  nextQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      if (this.activeSetId) {
        this.renderActiveSetQuizView();
      } else {
        this.render();
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  confirmResetSubjectHistory() {
    const sName = this.examData ? this.examData.subject_name : "วิชานี้";
    if (confirm(`คุณต้องการรีเซ็ตประวัติการทำข้อสอบของ ${sName} ทั้งหมดหรือไม่?\n\n(สถิติข้อที่เคยทำแล้วจะถูกล้างเริ่มต้นใหม่ทั้งหมด)`)) {
      ProgressStore.resetSubjectHistory(this.currentSubjectId);
      this.userAnswers = {};
      this.showingExplanations.clear();
      Utils.showToast("รีเซ็ตประวัติข้อสอบของวิชานี้เรียบร้อยแล้ว", "success");
      this.render();
    }
  },

  openHistoryModal(filter = "all") {
    this.historyModalFilter = filter;
    const progressMap = ProgressStore.getQuestionProgress(this.currentSubjectId);
    const summary = ProgressStore.getSubjectProgressSummary(this.currentSubjectId, this.allQuestions.length || 300);

    let filteredList = this.allQuestions;
    if (filter === "answered") {
      filteredList = this.allQuestions.filter(q => !!progressMap[q.id]);
    } else if (filter === "correct") {
      filteredList = this.allQuestions.filter(q => progressMap[q.id] && progressMap[q.id].isCorrect);
    } else if (filter === "wrong") {
      filteredList = this.allQuestions.filter(q => progressMap[q.id] && !progressMap[q.id].isCorrect);
    } else if (filter === "unanswered") {
      filteredList = this.allQuestions.filter(q => !progressMap[q.id]);
    }

    const modalHtml = `
      <div class="history-modal-overlay" id="history-modal-overlay" onclick="if(event.target === this) ExamEngine.closeHistoryModal()">
        <div class="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
          <div class="history-modal-header">
            <div>
              <h3 id="history-modal-title" style="margin: 0; font-size: var(--font-size-md);">
                ประวัติการทำข้อสอบแบบละเอียด (${this.examData ? this.examData.subject_name : ""})
              </h3>
              <div style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-top: 4px;">
                ทำแล้ว <strong>${summary.answered} / ${summary.total} ข้อ</strong> (${summary.percentage}%) • 
                <span style="color: var(--success); font-weight: 600;">ถูก ${summary.correct}</span> • 
                <span style="color: var(--danger); font-weight: 600;">ผิด ${summary.wrong}</span> • 
                <span>ยังไม่ทำ ${summary.remaining}</span>
              </div>
            </div>
            <button class="btn btn-ghost btn-icon-sm" onclick="ExamEngine.closeHistoryModal()" aria-label="ปิด">
              ${Icons.close()}
            </button>
          </div>

          <div class="history-modal-body">
            <!-- Filter Chips -->
            <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-4); flex-wrap: wrap;">
              <button class="btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="ExamEngine.openHistoryModal('all')">
                ทั้งหมด (${this.allQuestions.length})
              </button>
              <button class="btn btn-sm ${filter === 'answered' ? 'btn-primary' : 'btn-secondary'}" onclick="ExamEngine.openHistoryModal('answered')">
                ทำแล้ว (${summary.answered})
              </button>
              <button class="btn btn-sm ${filter === 'correct' ? 'btn-success' : 'btn-secondary'}" onclick="ExamEngine.openHistoryModal('correct')">
                ตอบถูก (${summary.correct})
              </button>
              <button class="btn btn-sm ${filter === 'wrong' ? 'btn-danger' : 'btn-secondary'}" onclick="ExamEngine.openHistoryModal('wrong')">
                ตอบผิด (${summary.wrong})
              </button>
              <button class="btn btn-sm ${filter === 'unanswered' ? 'btn-primary' : 'btn-secondary'}" onclick="ExamEngine.openHistoryModal('unanswered')">
                ยังไม่เคยทำ (${summary.remaining})
              </button>
            </div>

            <!-- Grid of 300 Questions -->
            <div class="history-grid">
              ${filteredList.map((q) => {
                const rec = progressMap[q.id];
                const isAns = !!rec;
                const isCor = isAns && rec.isCorrect;
                const statusCls = isAns ? (isCor ? "correct" : "wrong") : "unanswered";
                const qNum = q.id.split("_").pop();

                return `
                  <div class="history-grid-item ${statusCls}" onclick="ExamEngine.selectQuestionFromHistory('${q.id}')" title="คลิกเพื่อทำหรือดูข้อนี้">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                      <strong>ข้อ ${parseInt(qNum, 10)}</strong>
                      <span style="display: inline-flex; align-items: center;">${isAns ? (isCor ? `<span style="color: var(--success);">${Icons.check()}</span>` : `<span style="color: var(--danger);">${Icons.close()}</span>`) : `<span style="color: var(--text-tertiary);">${Icons.circle()}</span>`}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                      ${isAns ? `ตอบ: ${rec.selected} (เฉลย: ${q.correct_answer})` : 'ยังไม่ได้ทำ'}
                    </div>
                    ${rec && rec.timestamp ? `
                      <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">
                        ${new Date(rec.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <div style="padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; background-color: var(--bg-surface);">
            <button class="btn btn-outline btn-sm" onclick="ExamEngine.confirmResetSubjectHistory()">
              ${Icons.rotate()} รีเซ็ตประวัติวิชานี้
            </button>
            <button class="btn btn-primary btn-sm" onclick="ExamEngine.closeHistoryModal()">
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById("history-modal-overlay");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML("beforeend", modalHtml);
  },

  closeHistoryModal() {
    const el = document.getElementById("history-modal-overlay");
    if (el) el.remove();
  },

  selectQuestionFromHistory(qId) {
    this.closeHistoryModal();
    let targetIdx = this.questions.findIndex(item => item.id === qId);
    if (targetIdx === -1) {
      this.difficultyFilter = "all";
      this.filterAndPrepareQuestions();
      targetIdx = this.questions.findIndex(item => item.id === qId);
    }
    if (targetIdx >= 0) {
      this.currentIndex = targetIdx;
      this.render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  render() {
    if (this.isSubmitted) {
      this.renderScoreAndReview();
      return;
    }

    const q = this.questions[this.currentIndex];
    if (!q) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">ไม่พบข้อสอบตามเงื่อนไขที่เลือก</div>
          <div class="empty-state-desc">ลองเปลี่ยนระดับความยาก หรือยกเลิกการกรอง</div>
          <button class="btn btn-primary" onclick="ExamEngine.setDifficulty('all')">แสดงข้อสอบทั้งหมด</button>
        </div>
      `;
      return;
    }

    const totalInSession = this.questions.length;
    const isFlagged = this.flaggedQuestions.has(q.id);
    const selectedAnswer = this.userAnswers[q.id];
    const isShowingExplanation = this.showingExplanations.has(q.id);

    // Progress stats
    const progressSummary = ProgressStore.getSubjectProgressSummary(this.currentSubjectId, this.allQuestions.length || 300);
    const storedProgressMap = ProgressStore.getQuestionProgress(this.currentSubjectId);

    // Palette numbers
    let paletteHtml = this.questions.map((item, idx) => {
      const isCur = idx === this.currentIndex;
      const isAnsSession = !!this.userAnswers[item.id];
      const isFlg = this.flaggedQuestions.has(item.id);
      const isPrevAnswered = !!storedProgressMap[item.id];

      let cls = "palette-btn";
      if (isCur) cls += " active";
      else if (isAnsSession) cls += " answered";
      else if (isPrevAnswered) cls += " previously-done";
      if (isFlg) cls += " flagged";

      return `<button class="${cls}" onclick="ExamEngine.jumpTo(${idx})" title="ข้อที่ ${idx + 1} (${item.id})">${idx + 1}</button>`;
    }).join("");

    // Choices
    let optionsHtml = (q.options || []).map(opt => {
      const isSelected = selectedAnswer === opt.label;
      return `
        <div class="option-card ${isSelected ? 'selected' : ''}" onclick="ExamEngine.selectAnswer('${q.id}', '${opt.label}')">
          <div class="option-label-circle">${opt.label}</div>
          <div class="option-text">${MathRenderer.formatMathString(Utils.escapeHtml(opt.text))}</div>
        </div>
      `;
    }).join("");

    const manifest = DataLoader.manifest;
    const subjectList = manifest ? manifest.exam_modules : [];
    let subjectDropdown = subjectList.map(s => `
      <option value="${s.id}" ${s.id === this.currentSubjectId ? 'selected' : ''}>
        ${s.id}. ${Utils.escapeHtml(s.title)} (${s.question_count || 300} ข้อ)
      </option>
    `).join("");

    this.container.innerHTML = `
      <div class="reader-container">
        <!-- 1. Header Bar with Segmented Studio Tabs -->
        ${this.renderStudioHeader("คลังข้อสอบรายวิชา (300 ข้อ)")}

        <!-- Top Caption Explaining Eye Button -->
        ${!this.hintDismissed ? `
        <div class="exam-hint-caption" id="exam-hint-caption" role="note">
          <div style="display: flex; align-items: center; gap: var(--space-2); flex: 1;">
            ${Icons.eye()}
            <span>คำแนะนำ: แตะที่ปุ่มรูปดวงตา ในข้อสอบ เพื่อเปิดดูเฉลยและวิธีคิดเชิงลึกของข้อนั้นได้ทันที</span>
          </div>
          <button type="button" class="exam-hint-close-btn" onclick="ExamEngine.dismissHint()" title="ปิดคำแนะนำ" aria-label="ปิดคำแนะนำ">
            ${Icons.close()}
          </button>
        </div>
        ` : ''}

        <!-- Progress Tracking & History Header Card -->
        <div class="exam-progress-card">
          <div class="exam-progress-header">
            <div class="exam-progress-title">
              ${Icons.exam()}
              <span>ประวัติการฝึกทำ: ${progressSummary.answered} / ${progressSummary.total} ข้อ (${progressSummary.percentage}%)</span>
            </div>
            <div class="exam-progress-stats">
              <span class="badge badge-success" style="padding: 2px 8px; margin-right: 4px;">ถูก ${progressSummary.correct}</span>
              <span class="badge badge-danger" style="padding: 2px 8px; margin-right: 4px;">ผิด ${progressSummary.wrong}</span>
              <span class="badge badge-default" style="padding: 2px 8px;">ยังไม่ทำ ${progressSummary.remaining}</span>
            </div>
          </div>

          <div class="exam-progress-bar-bg" title="ความคืบหน้าภาพรวม ${progressSummary.percentage}%">
            <div class="exam-progress-bar-fill" style="width: ${progressSummary.percentage}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2);">
            <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">
              ระบบจะบันทึกข้อที่ทำแล้วอัตโนมัติลงในประวัติ
            </div>
            <div style="display: flex; gap: var(--space-2);">
              <button class="btn btn-secondary btn-sm" onclick="ExamEngine.openHistoryModal()">
                ${Icons.history()} <span>ดูประวัติแบบละเอียด</span>
              </button>
              <button class="btn btn-outline btn-sm" onclick="ExamEngine.confirmResetSubjectHistory()" title="รีเซ็ตประวัติข้อที่ทำแล้วของวิชานี้">
                ${Icons.rotate()} <span>รีเซ็ตประวัติ</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Subject Switcher & Exam Control Toolbar -->
        <div class="exam-control-bar">
          <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
            <select class="input-text" style="max-width: 320px; padding-left: 0.75rem;" onchange="ExamEngine.init(ExamEngine.container, this.value)">
              ${subjectDropdown}
            </select>

            <!-- Difficulty Filter (ง่าย vs ยาก) -->
            <div class="radio-pill-group" role="group" aria-label="ระดับความยาก">
              <button class="radio-pill-btn ${this.difficultyFilter === 'all' ? 'active' : ''}" onclick="ExamEngine.setDifficulty('all')" title="ข้อสอบทั้งหมด 300 ข้อ">
                ทั้งหมด (300)
              </button>
              <button class="radio-pill-btn ${this.difficultyFilter === 'easy' ? 'active' : ''}" onclick="ExamEngine.setDifficulty('easy')" title="ข้อสอบระดับง่าย-มาตรฐาน">
                ง่าย (ระดับ 1-3)
              </button>
              <button class="radio-pill-btn ${this.difficultyFilter === 'hard' ? 'active' : ''}" onclick="ExamEngine.setDifficulty('hard')" title="ข้อสอบระดับยาก-วิเคราะห์เชิงลึก">
                ยาก (ระดับ 4-5)
              </button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
            <!-- Randomizer Toggle -->
            <button class="btn btn-sm ${this.isRandomized ? 'btn-primary' : 'btn-secondary'}" onclick="ExamEngine.toggleRandomize()" title="สลับโหมดสุ่มข้อ" style="display: inline-flex; align-items: center; gap: 4px;">
              ${this.isRandomized ? `${Icons.shuffle()} <span>สุ่มข้อ (เปิด)</span>` : `${Icons.sortAsc()} <span>เรียงตามข้อ</span>`}
            </button>

            <!-- Custom Timer Inputs (Unlimited Minutes) -->
            <div style="display: flex; align-items: center; gap: 4px; background-color: var(--bg-subtle); padding: 2px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
              <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">${Icons.clock()}</span>
              <input type="number" min="1" step="5" class="timer-minute-input" value="${this.timerMinutes}" onchange="ExamEngine.setCustomTimerMinutes(this.value)" title="ตั้งเวลาสอบ (นาที ไม่จำกัด)" aria-label="ตั้งเวลาเป็นนาที">
              <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">นาที</span>
            </div>

            <button class="btn btn-secondary btn-sm" onclick="ExamEngine.toggleTimerMode()">
              ${this.isTimed ? 'จับเวลา' : 'ไม่จับเวลา'}
            </button>
          </div>
        </div>

        <!-- Exam Header Status Bar -->
        <div class="exam-header-bar">
          <div>
            <span class="badge badge-accent">ข้อที่ ${this.currentIndex + 1} จาก ${totalInSession}</span>
            <span class="badge ${q.difficulty_level <= 3 ? 'badge-success' : 'badge-danger'}" style="margin-left: 4px;">
              ${q.difficulty_level <= 3 ? 'ง่าย (ระดับ ' + q.difficulty_level + ')' : 'ยาก (ระดับ ' + q.difficulty_level + ')'}
            </span>
            <span style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-left: 6px;">
              ${Utils.escapeHtml(q.topic || "")}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div class="exam-timer" id="exam-timer-display">
              ${this.isTimed ? Utils.formatTime(this.timerSeconds) : 'ไม่จับเวลา'}
            </div>
            <button class="btn btn-secondary btn-sm" onclick="ExamEngine.toggleFlag('${q.id}')" style="display: flex; align-items: center; gap: 4px;">
              ${Icons.flag("", isFlagged)} <span>${isFlagged ? 'ยกเลิกมาร์ก' : 'มาร์กไว้ทบทวน'}</span>
            </button>
          </div>
        </div>

        <!-- Question Palette -->
        <div class="question-palette">
          ${paletteHtml}
        </div>

        <!-- Main Question Card -->
        <div class="question-card" id="active-question-card">
          <!-- Card Header Toolbar with Eye Button -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
            <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">
              รหัสข้อสอบ: <strong>${q.id}</strong> | ${Utils.escapeHtml(q.question_pattern || "")}
            </div>

            <!-- Eye Icon Button strictly with NO text label -->
            <button class="btn btn-secondary btn-icon-only eye-btn ${isShowingExplanation ? 'active' : ''}" 
                    id="eye-btn-${q.id}" 
                    onclick="ExamEngine.toggleQuestionExplanation('${q.id}')" 
                    title="เปิดดูเฉลยละเอียดของข้อนี้" 
                    aria-label="ดูเฉลย">
              ${isShowingExplanation ? Icons.eyeOff() : Icons.eye()}
            </button>
          </div>

          ${q.scenario ? `
            <div class="scenario-box">
              <strong>บริบท/สถานการณ์:</strong><br>
              ${MathRenderer.formatMathString(Utils.escapeHtml(q.scenario))}
            </div>
          ` : ''}

          <div class="question-text">
            ${this.currentIndex + 1}. ${MathRenderer.formatMathString(Utils.escapeHtml(q.question))}
          </div>

          <div class="options-list">
            ${optionsHtml}
          </div>

          <!-- Inline Explanation Revealed by Eye Button -->
          ${isShowingExplanation ? `
            <div class="inline-explanation-wrapper" id="inline-explanation-${q.id}">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
                <span style="font-weight: 700; color: var(--accent); font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px;">
                  ${Icons.eye()} เฉลยและวิธีคิดเชิงลึกเฉพาะข้อนี้
                </span>
                <button class="btn btn-ghost btn-sm" onclick="ExamEngine.toggleQuestionExplanation('${q.id}')" style="font-size: 11px;">
                  ปิดเฉลยข้อนี้
                </button>
              </div>
              ${ExplanationRenderer.renderExplanation(q, false)}
            </div>
          ` : ''}

          <!-- Bottom Navigation Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: var(--space-4); margin-top: var(--space-4);">
            <button class="btn btn-secondary" onclick="ExamEngine.prevQuestion()" ${this.currentIndex <= 0 ? 'disabled' : ''}>
              ${Icons.chevronLeft()} ข้อก่อนหน้า
            </button>

            ${this.currentIndex === totalInSession - 1 ? `
              <button class="btn btn-primary" onclick="ExamEngine.confirmSubmit()">
                ${Icons.check()} ส่งคำตอบตรวจคะแนน
              </button>
            ` : `
              <button class="btn btn-primary" onclick="ExamEngine.nextQuestion()">
                ข้อถัดไป ${Icons.chevronRight()}
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    const activeCard = document.getElementById("active-question-card");
    if (activeCard) {
      MathRenderer.renderElement(activeCard);
    }
  },

  confirmSubmit() {
    const answeredCount = Object.keys(this.userAnswers).length;
    const total = this.questions.length;
    const unanswered = total - answeredCount;

    let msg = `คุณทำข้อสอบไปแล้ว ${answeredCount} จาก ${total} ข้อ`;
    if (unanswered > 0) {
      msg += `\n(ยังมีข้อที่ยังไม่ได้ตอบอีก ${unanswered} ข้อ)`;
    }
    msg += "\n\nคุณต้องการยืนยันการส่งคำตอบเพื่อตรวจคะแนนหรือไม่?";

    if (confirm(msg)) {
      this.submitExam(false);
    }
  },

  submitExam(isAuto = false) {
    this.stopTimer();
    this.isSubmitted = true;

    // Calculate score
    let score = 0;
    const wrongQuestions = [];
    this.questions.forEach((q, idx) => {
      const userAns = this.userAnswers[q.id];
      if (userAns === q.correct_answer) {
        score++;
      } else {
        wrongQuestions.push({
          index: idx,
          qId: q.id,
          userAns,
          correctAns: q.correct_answer
        });
      }
    });

    // Save to ProgressStore
    ProgressStore.saveExamAttempt({
      subjectId: this.currentSubjectId,
      subjectName: this.examData.subject_name,
      score,
      total: this.questions.length,
      percentage: Math.round((score / this.questions.length) * 100),
      timeSpent: this.timeSpentSeconds,
      wrongCount: wrongQuestions.length,
      difficulty: this.difficultyFilter,
      isRandomized: this.isRandomized
    });

    this.renderScoreAndReview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  renderScoreAndReview() {
    const total = this.questions.length;
    let score = 0;
    this.questions.forEach(q => {
      if (this.userAnswers[q.id] === q.correct_answer) score++;
    });

    const percent = Math.round((score / total) * 100);
    const isPass = percent >= 60;

    let displayQuestions = this.questions;
    if (this.filterReviewWrongOnly) {
      displayQuestions = this.questions.filter(q => this.userAnswers[q.id] !== q.correct_answer);
    }

    this.container.innerHTML = `
      <div class="reader-container">
        <!-- 1. Header Bar with Segmented Studio Tabs -->
        ${this.renderStudioHeader("คลังข้อสอบรายวิชา (300 ข้อ)")}

        <!-- Score Summary Card -->
        <div class="card" style="text-align: center; padding: var(--space-8); margin-bottom: var(--space-6); border-top: 4px solid ${isPass ? 'var(--success)' : 'var(--danger)'};">
          <span class="badge ${isPass ? 'badge-success' : 'badge-danger'}" style="font-size: var(--font-size-sm); padding: 4px 12px; margin-bottom: var(--space-2);">
            ${isPass ? 'ผ่านเกณฑ์ประเมิน (>= 60%)' : 'ยังไม่ผ่านเกณฑ์ (< 60%)'}
          </span>
          <h2 style="font-size: var(--font-size-2xl); margin: var(--space-2) 0;">${score} / ${total} คะแนน</h2>
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
            คิดเป็น ${percent}% • ใช้เวลาสอบไป ${Utils.formatTime(this.timeSpentSeconds)} • ระดับ: ${this.difficultyFilter === 'easy' ? 'ง่าย' : (this.difficultyFilter === 'hard' ? 'ยาก' : 'ทั้งหมด')}
          </p>

          <div style="display: flex; justify-content: center; gap: var(--space-3); flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="ExamEngine.toggleFilterWrong()">
              ${this.filterReviewWrongOnly ? 'แสดงข้อสอบทั้งหมด' : 'ดูเฉพาะข้อที่ตอบผิด'}
            </button>
            <button class="btn btn-primary btn-sm" onclick="ExamEngine.init(ExamEngine.container, ExamEngine.currentSubjectId)">
              ทำข้อสอบชุดนี้ใหม่อีกครั้ง
            </button>
            <button class="btn btn-outline btn-sm" onclick="ExamEngine.openHistoryModal()">
              ${Icons.history()} ดูประวัติสะสม
            </button>
          </div>
        </div>

        <h3 style="margin-bottom: var(--space-4);">เฉลยละเอียดและวิเคราะห์เชิงลึก (${displayQuestions.length} ข้อ)</h3>

        <!-- Questions Review List -->
        <div style="display: flex; flex-direction: column; gap: var(--space-6);">
          ${displayQuestions.map((q, idx) => {
            const userAns = this.userAnswers[q.id];
            const isCorrect = userAns === q.correct_answer;
            const originalIndex = this.questions.findIndex(item => item.id === q.id) + 1;

            return `
              <div class="card" style="border-left: 4px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
                  <div style="display: flex; align-items: center; gap: var(--space-2);">
                    <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}">ข้อ ${originalIndex}</span>
                    <span style="font-weight: 600; font-size: var(--font-size-xs); color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">
                      ${isCorrect ? 'ตอบถูกต้อง (+1)' : 'ตอบผิด (0)'}
                    </span>
                  </div>
                  <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">
                    คำตอบของคุณ: <strong>${userAns || 'ไม่ได้ตอบ'}</strong> | เฉลยที่ถูกต้อง: <strong style="color: var(--success);">${q.correct_answer}</strong>
                  </span>
                </div>

                ${q.scenario ? `
                  <div class="scenario-box">
                    <strong>สถานการณ์:</strong> ${MathRenderer.formatMathString(Utils.escapeHtml(q.scenario))}
                  </div>
                ` : ''}

                <div style="font-weight: 600; margin-bottom: var(--space-4);">
                  ${MathRenderer.formatMathString(Utils.escapeHtml(q.question))}
                </div>

                <!-- 4 Options Review -->
                <div class="options-list" style="margin-bottom: var(--space-4);">
                  ${q.options.map(opt => {
                    const isUserPick = userAns === opt.label;
                    const isRightPick = q.correct_answer === opt.label;
                    let optClass = "option-card";
                    if (isRightPick) optClass += " correct";
                    else if (isUserPick) optClass += " incorrect";

                    return `
                      <div class="${optClass}" style="cursor: default;">
                        <div class="option-label-circle">${opt.label}</div>
                        <div class="option-text">
                          ${MathRenderer.formatMathString(Utils.escapeHtml(opt.text))}
                          ${isRightPick ? ' <span class="badge badge-success" style="margin-left: 6px;">คำตอบที่ถูกต้อง</span>' : ''}
                          ${isUserPick && !isRightPick ? ' <span class="badge badge-danger" style="margin-left: 6px;">คำตอบที่คุณเลือก</span>' : ''}
                        </div>
                      </div>
                    `;
                  }).join("")}
                </div>

                <!-- Deep 9-Section Explanation Box -->
                ${ExplanationRenderer.renderExplanation(q, true)}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    MathRenderer.renderElement(this.container);
  },

  toggleFilterWrong() {
    this.filterReviewWrongOnly = !this.filterReviewWrongOnly;
    this.renderScoreAndReview();
  }
};

if (typeof window !== "undefined") {
  window.ExamEngine = ExamEngine;
}
