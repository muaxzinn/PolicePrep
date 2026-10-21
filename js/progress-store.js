/**
 * ProgressStore Module
 * Manages local persistence for Bookmarks, Reading Positions, Exam Attempts, and User Settings
 */
const ProgressStore = {
  KEYS: {
    SETTINGS: "examprep_settings",
    BOOKMARKS: "examprep_bookmarks",
    LAST_READ: "examprep_last_read",
    EXAM_HISTORY: "examprep_exam_history",
    ACTIVE_EXAM: "examprep_active_exam",
    QUESTION_PROGRESS: "examprep_question_progress",
    OXFORD_PROGRESS: "examprep_oxford_progress",
    MOCK_SETS: "examprep_mock_sets"
  },

  /* --- Question Progress & Done Tracking --- */
  getQuestionProgress(subjectId = null) {
    const allProgress = Utils.getStorage(this.KEYS.QUESTION_PROGRESS, {});
    if (subjectId) {
      return allProgress[subjectId] || {};
    }
    return allProgress;
  },

  recordQuestionAnswer(subjectId, qId, selected, isCorrect) {
    const allProgress = Utils.getStorage(this.KEYS.QUESTION_PROGRESS, {});
    if (!allProgress[subjectId]) {
      allProgress[subjectId] = {};
    }
    const prev = allProgress[subjectId][qId] || {};
    allProgress[subjectId][qId] = {
      qId,
      selected,
      isCorrect,
      timestamp: Date.now(),
      attempts: (prev.attempts || 0) + 1,
      lastUpdated: new Date().toISOString()
    };
    Utils.setStorage(this.KEYS.QUESTION_PROGRESS, allProgress);
    return allProgress[subjectId][qId];
  },

  resetSubjectHistory(subjectId) {
    const allProgress = Utils.getStorage(this.KEYS.QUESTION_PROGRESS, {});
    if (allProgress[subjectId]) {
      delete allProgress[subjectId];
      Utils.setStorage(this.KEYS.QUESTION_PROGRESS, allProgress);
    }
    return true;
  },

  getSubjectProgressSummary(subjectId, totalQuestions = 300) {
    const progress = this.getQuestionProgress(subjectId);
    const answeredIds = Object.keys(progress);
    const answered = answeredIds.length;
    let correct = 0;
    let wrong = 0;
    answeredIds.forEach(id => {
      if (progress[id].isCorrect) correct++;
      else wrong++;
    });
    const remaining = Math.max(0, totalQuestions - answered);
    const percentage = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;
    return {
      total: totalQuestions,
      answered,
      correct,
      wrong,
      remaining,
      percentage
    };
  },

  /* --- Settings --- */
  getSettings() {
    return Utils.getStorage(this.KEYS.SETTINGS, {
      theme: "system",
      fontSize: "normal",
      timerMinutes: 20,
      audioVoice: "", // empty = auto-detect Google Female default
      audioRate: 0.85, // default normal rate (1.0x = 0.85 as specified)
      allowRecycleMockSets: false // default false: limit to unique questions in database
    });
  },

  saveSettings(settings) {
    return Utils.setStorage(this.KEYS.SETTINGS, settings);
  },

  /* --- Bookmarks --- */
  getBookmarks() {
    return Utils.getStorage(this.KEYS.BOOKMARKS, []);
  },

  isBookmarked(subjectId, pageNum) {
    const list = this.getBookmarks();
    return list.some(b => b.subjectId === subjectId && b.pageNum === pageNum);
  },

  toggleBookmark(subjectId, subjectTitle, pageNum) {
    let list = this.getBookmarks();
    const idx = list.findIndex(b => b.subjectId === subjectId && b.pageNum === pageNum);
    if (idx >= 0) {
      list.splice(idx, 1);
      this.saveBookmarks(list);
      return false; // removed
    } else {
      list.unshift({
        subjectId,
        subjectTitle,
        pageNum,
        timestamp: Date.now()
      });
      this.saveBookmarks(list);
      return true; // added
    }
  },

  saveBookmarks(list) {
    return Utils.setStorage(this.KEYS.BOOKMARKS, list);
  },

  /* --- Last Read Position --- */
  getLastRead() {
    return Utils.getStorage(this.KEYS.LAST_READ, {});
  },

  setLastRead(subjectId, pageNum) {
    const map = this.getLastRead();
    map[subjectId] = {
      pageNum,
      timestamp: Date.now()
    };
    return Utils.setStorage(this.KEYS.LAST_READ, map);
  },

  /* --- Exam History --- */
  getExamHistory() {
    return Utils.getStorage(this.KEYS.EXAM_HISTORY, []);
  },

  saveExamAttempt(record) {
    const history = this.getExamHistory();
    history.unshift({
      id: "attempt_" + Date.now(),
      timestamp: Date.now(),
      ...record
    });
    return Utils.setStorage(this.KEYS.EXAM_HISTORY, history);
  },

  clearExamHistory() {
    return Utils.removeStorage(this.KEYS.EXAM_HISTORY);
  },

  /* --- Active Exam State --- */
  getActiveExam() {
    return Utils.getStorage(this.KEYS.ACTIVE_EXAM, null);
  },

  saveActiveExam(state) {
    return Utils.setStorage(this.KEYS.ACTIVE_EXAM, state);
  },

  clearActiveExam() {
    return Utils.removeStorage(this.KEYS.ACTIVE_EXAM);
  },

  /* --- Oxford 3000 Flashcard & Vocab Progress --- */
  getOxfordProgress() {
    return Utils.getStorage(this.KEYS.OXFORD_PROGRESS, { mastered: {}, review: {} });
  },

  setOxfordWordStatus(wordId, status) {
    const data = this.getOxfordProgress();
    if (!data.mastered) data.mastered = {};
    if (!data.review) data.review = {};

    if (status === "mastered") {
      data.mastered[wordId] = Date.now();
      delete data.review[wordId];
    } else if (status === "review") {
      data.review[wordId] = Date.now();
      delete data.mastered[wordId];
    } else {
      delete data.mastered[wordId];
      delete data.review[wordId];
    }
    Utils.setStorage(this.KEYS.OXFORD_PROGRESS, data);
    return data;
  },

  getOxfordStats() {
    const data = this.getOxfordProgress();
    return {
      masteredCount: Object.keys(data.mastered || {}).length,
      reviewCount: Object.keys(data.review || {}).length
    };
  },

  resetOxfordProgress() {
    return Utils.removeStorage(this.KEYS.OXFORD_PROGRESS);
  },

  /* --- Mock Exam Sets (160 Questions) --- */
  getMockSets() {
    return Utils.getStorage(this.KEYS.MOCK_SETS, null);
  },

  saveMockSets(data) {
    return Utils.setStorage(this.KEYS.MOCK_SETS, data);
  },

  resetMockSets() {
    return Utils.removeStorage(this.KEYS.MOCK_SETS);
  },

  /* --- Clear All App Data --- */
  resetAllData() {
    Object.values(this.KEYS).forEach(k => Utils.removeStorage(k));
  },

  /* --- Selective Data Reset Helpers --- */
  getDataCategoriesStatus() {
    const examHistory = this.getExamHistory();
    const qProgress = this.getQuestionProgress();
    let answeredQCount = 0;
    if (qProgress && typeof qProgress === "object") {
      Object.values(qProgress).forEach(sub => {
        if (sub && typeof sub === "object") {
          answeredQCount += Object.keys(sub).length;
        }
      });
    }
    const activeExam = this.getActiveExam();
    const oxStats = this.getOxfordStats();
    const bookmarks = this.getBookmarks();
    const lastRead = this.getLastRead();
    const lastReadCount = Object.keys(lastRead || {}).length;
    const settings = Utils.getStorage(this.KEYS.SETTINGS, null);

    return [
      {
        key: this.KEYS.EXAM_HISTORY,
        title: "ประวัติและผลคะแนนการสอบ",
        subtitle: "Exam History & Test Records",
        desc: "ผลการทดสอบ, เวลาที่ใช้, เฉลยคำตอบ และประวัติคะแนนที่เคยสอบทั้งหมด",
        countText: examHistory.length > 0 ? `${examHistory.length} รอบสอบ` : "ไม่มีประวัติ",
        hasData: examHistory.length > 0,
        badgeType: examHistory.length > 0 ? "accent" : "subtle",
        icon: "history"
      },
      {
        key: this.KEYS.QUESTION_PROGRESS,
        title: "ความคืบหน้ารายข้อ & ข้อที่ทำแล้ว",
        subtitle: "Question Practice Progress",
        desc: "บันทึกข้อที่เคยทำแล้ว (ถูก/ผิด/จำนวนครั้ง) ในคลังข้อสอบแต่ละวิชา",
        countText: answeredQCount > 0 ? `${answeredQCount} ข้อที่เคยตอบ` : "ไม่มีบันทึก",
        hasData: answeredQCount > 0,
        badgeType: answeredQCount > 0 ? "accent" : "subtle",
        icon: "checkSquare"
      },
      {
        key: this.KEYS.ACTIVE_EXAM,
        title: "ชุดข้อสอบที่ทำค้างอยู่",
        subtitle: "Active Exam Session",
        desc: "สถานะข้อสอบที่ทำค้างไว้ชั่วคราวและยังไม่ได้กดยื่นส่งผลสอบ",
        countText: activeExam ? "มีชุดข้อสอบค้างอยู่" : "ไม่มีข้อสอบค้าง",
        hasData: !!activeExam,
        badgeType: activeExam ? "warning" : "subtle",
        icon: "clock"
      },
      {
        key: this.KEYS.OXFORD_PROGRESS,
        title: "ความคืบหน้าท่องคำศัพท์ Oxford 3000",
        subtitle: "Oxford Vocab Bank & Flashcards",
        desc: "คำศัพท์ที่บันทึกว่าจำได้แล้ว (Mastered) และคำที่ต้องทบทวนซ้ำ (Review)",
        countText: (oxStats.masteredCount + oxStats.reviewCount) > 0 
          ? `${oxStats.masteredCount + oxStats.reviewCount} คำ (จำได้ ${oxStats.masteredCount}, ทบทวน ${oxStats.reviewCount})` 
          : "ยังไม่มีประวัติท่องจำ",
        hasData: (oxStats.masteredCount + oxStats.reviewCount) > 0,
        badgeType: (oxStats.masteredCount + oxStats.reviewCount) > 0 ? "accent" : "subtle",
        icon: "layers"
      },
      {
        key: this.KEYS.MOCK_SETS,
        title: "ชุดข้อสอบเสมือนจริง 160 ข้อ (Mock Exam Sets)",
        subtitle: "Mock Exam Sets & Practice Progress",
        desc: "ชุดข้อสอบรวม 8 โมดูลที่สุ่มไว้ และสถิติผลคะแนนการทำข้อสอบจำลองแต่ละชุด",
        countText: (function() {
          const ms = Utils.getStorage("examprep_mock_sets", null);
          if (ms && ms.sets && ms.sets.length > 0) {
            const completedCount = ms.sets.filter(s => s.isCompleted).length;
            return `${ms.sets.length} ชุด (ทำแล้ว ${completedCount} ชุด)`;
          }
          return "ยังไม่มีชุดที่สร้าง";
        })(),
        hasData: (function() {
          const ms = Utils.getStorage("examprep_mock_sets", null);
          return !!(ms && ms.sets && ms.sets.length > 0);
        })(),
        badgeType: "accent",
        icon: "exam"
      },
      {
        key: this.KEYS.BOOKMARKS,
        title: "ที่คั่นหน้าและข้อสอบที่บันทึกไว้",
        subtitle: "Bookmarks & Saved Items",
        desc: "รายการข้อสอบหรือหน้าเนื้อหาวิชาที่กดติดดาว/บันทึกไว้ดูย้อนหลัง",
        countText: bookmarks.length > 0 ? `${bookmarks.length} รายการ` : "ไม่มีรายการบันทึก",
        hasData: bookmarks.length > 0,
        badgeType: bookmarks.length > 0 ? "accent" : "subtle",
        icon: "bookmark"
      },
      {
        key: this.KEYS.LAST_READ,
        title: "ตำแหน่งเปิดอ่านล่าสุด",
        subtitle: "Last Reading Position",
        desc: "ตำแหน่งหน้าเนื้อหาล่าสุดที่เปิดอ่านค้างไว้สำหรับกลับมาอ่านต่อ",
        countText: lastReadCount > 0 ? `${lastReadCount} วิชา` : "ไม่มีบันทึก",
        hasData: lastReadCount > 0,
        badgeType: lastReadCount > 0 ? "accent" : "subtle",
        icon: "book"
      },
      {
        key: this.KEYS.SETTINGS,
        title: "การตั้งค่าระบบและเสียงอ่าน",
        subtitle: "Preferences & Audio Settings",
        desc: "ธีมสีหน้าจอ (Dark/Light), ขนาดตัวอักษร, เสียงอ่านที่เลือก, ความเร็ว และเวลาสอบเริ่มต้น",
        countText: settings ? "มีการตั้งค่าที่กำหนดเอง" : "ค่ามาตรฐาน",
        hasData: !!settings,
        badgeType: settings ? "info" : "subtle",
        icon: "settings"
      }
    ];
  },

  resetSpecificData(keysArray) {
    if (!Array.isArray(keysArray)) return;
    keysArray.forEach(k => Utils.removeStorage(k));
  }
};

if (typeof window !== "undefined") {
  window.ProgressStore = ProgressStore;
}
