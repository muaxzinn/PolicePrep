/**
 * UI Module
 * Handles Theme toggles (Light/Dark/System), Font scaling, History views, and Settings
 */
const UI = {
  initTheme() {
    const settings = ProgressStore.getSettings();
    this.applyTheme(settings.theme || "system");
    this.applyFontSize(settings.fontSize || "normal");

    // Listen to OS theme changes if on system
    if (typeof window !== "undefined" && window.matchMedia) {
      try {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        if (mq && mq.addEventListener) {
          mq.addEventListener("change", (e) => {
            const current = ProgressStore.getSettings();
            if (current.theme === "system") {
              this.applyTheme("system");
            }
          });
        }
      } catch (e) {
        // Fallback for older browsers
      }
    }
  },

  applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else if (theme === "sepia") {
      root.setAttribute("data-theme", "sepia");
    } else if (theme === "light") {
      root.removeAttribute("data-theme");
    } else {
      // System
      let isDark = false;
      if (typeof window !== "undefined" && window.matchMedia) {
        try {
          isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        } catch (e) {}
      }
      if (isDark) {
        root.setAttribute("data-theme", "dark");
      } else {
        root.removeAttribute("data-theme");
      }
    }
  },

  setTheme(theme) {
    const settings = ProgressStore.getSettings();
    settings.theme = theme;
    ProgressStore.saveSettings(settings);
    this.applyTheme(theme);
    const themeLabel = theme === 'dark' ? 'โหมดกลางคืน' : theme === 'sepia' ? 'โหมดถนอมสายตา (Sepia)' : theme === 'light' ? 'โหมดสว่าง' : 'ตามระบบ';
    Utils.showToast(`เปลี่ยนธีมเป็น: ${themeLabel}`, "default");
  },

  applyFontSize(size) {
    document.documentElement.setAttribute("data-font-size", size);
  },

  setFontSize(size) {
    const settings = ProgressStore.getSettings();
    settings.fontSize = size;
    ProgressStore.saveSettings(settings);
    this.applyFontSize(size);
    Utils.showToast(`ปรับขนาดตัวอักษร: ${size}`, "default");
  },

  /**
   * Render Comprehensive History & Analytics Studio
   * Includes direct Oxford 3000 progress linkage, 300-question subject progress, exam attempts & bookmarks
   */
  renderHistory(container) {
    const manifest = DataLoader.manifest || {};
    const subjectList = (manifest.exam_modules && manifest.exam_modules.length > 0) ? manifest.exam_modules : [
      { id: "01", title: "คณิตศาสตร์ (ความสามารถทั่วไป)", question_count: 300 },
      { id: "02", title: "ภาษาไทย", question_count: 300 },
      { id: "03", title: "ภาษาอังกฤษ", question_count: 300 },
      { id: "04", title: "คอมพิวเตอร์และเทคโนโลยีสารสนเทศ", question_count: 300 },
      { id: "05", title: "กฎหมายที่ประชาชนควรรู้", question_count: 300 },
      { id: "06", title: "ระเบียบสำนักนายกรัฐมนตรี ว่าด้วยงานสารบรรณ", question_count: 300 },
      { id: "07", title: "ระเบียบสำนักงานตำรวจแห่งชาติ (ลักษณะที่ 54)", question_count: 300 },
      { id: "08", title: "ข้อสอบ 150 ข้อ (งานสารบรรณ + ลักษณะที่ 54)", question_count: 300 }
    ];

    // Compute Overall Question Bank Progress
    let totalQuestionsPool = 0;
    let totalAnsweredCount = 0;
    let totalCorrectCount = 0;
    let totalWrongCount = 0;

    const subjectProgressData = subjectList.map(s => {
      const qTotal = s.question_count || 300;
      totalQuestionsPool += qTotal;
      const prog = ProgressStore.getSubjectProgressSummary(s.id, qTotal);
      totalAnsweredCount += prog.answered;
      totalCorrectCount += prog.correct;
      totalWrongCount += prog.wrong;
      const acc = prog.answered > 0 ? Math.round((prog.correct / prog.answered) * 100) : 0;
      return {
        ...s,
        ...prog,
        accuracy: acc
      };
    });

    const overallAccuracy = totalAnsweredCount > 0 ? Math.round((totalCorrectCount / totalAnsweredCount) * 100) : 0;
    const overallProgressPercent = totalQuestionsPool > 0 ? Math.round((totalAnsweredCount / totalQuestionsPool) * 100) : 0;

    // Compute Oxford 3000 Vocabulary Progress
    const oxStats = ProgressStore.getOxfordStats();
    const oxMastered = oxStats.masteredCount || 0;
    const oxReview = oxStats.reviewCount || 0;
    const oxTotal = 3250; // Total Oxford 3000 words across A1, A2, B1, B2
    const oxUnseen = Math.max(0, oxTotal - oxMastered - oxReview);
    const oxMasteredPercent = Math.round((oxMastered / oxTotal) * 100);
    const oxReviewPercent = Math.round((oxReview / oxTotal) * 100);
    const oxLearnedPercent = Math.min(100, Math.round(((oxMastered + oxReview) / oxTotal) * 100));

    // Exam Session History & Bookmarks
    const history = ProgressStore.getExamHistory();
    const bookmarks = ProgressStore.getBookmarks();

    container.innerHTML = `
      <div class="history-hub-container">
        <!-- Hero Header Card -->
        <div class="history-hero-card">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
              <h2 style="margin: 0; font-size: var(--font-size-lg); font-weight: 800; color: var(--text-primary);">
                ศูนย์ประวัติการเรียนรู้และความคืบหน้า
              </h2>
              <span class="badge badge-accent" style="font-size: 11px;">Learning Analytics</span>
            </div>
            <p style="color: var(--text-secondary); font-size: var(--font-size-xs); margin: 0;">
              สรุปสถิติการฝึกฝนข้อสอบ คลังคำศัพท์ Oxford 3000 และหน้าที่คั่นไว้ในระบบ PolicePrep®
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="UI.openSelectiveResetModal()" title="เลือกล้างหรือรีเซ็ตข้อมูลเฉพาะส่วน" style="display: inline-flex; align-items: center; gap: 6px;">
              ${Icons.sliders ? Icons.sliders() : Icons.settings()}
              <span>เลือกรีเซ็ตข้อมูล</span>
            </button>
          </div>
        </div>

        <!-- 4-Column KPI Overview Grid -->
        <div class="history-kpi-grid">
          <!-- KPI 1: Total Exam Practice -->
          <div class="history-kpi-box">
            <div class="history-kpi-header">
              <span>การฝึกทำข้อสอบทั้งหมด</span>
              ${Icons.exam()}
            </div>
            <div class="history-kpi-value">${totalAnsweredCount.toLocaleString()} <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">/ ${totalQuestionsPool.toLocaleString()} ข้อ</span></div>
            <div class="progress-bar-bg" style="height: 6px; margin: 4px 0 2px 0;">
              <div class="progress-bar-fill" style="width: ${overallProgressPercent}%;"></div>
            </div>
            <div class="history-kpi-desc">ทำแล้ว ${overallProgressPercent}% • ความแม่นยำเฉลี่ย ${overallAccuracy}%</div>
          </div>

          <!-- KPI 2: Oxford 3000 Progress -->
          <div class="history-kpi-box">
            <div class="history-kpi-header">
              <span>คำศัพท์ Oxford 3000</span>
              ${Icons.layers()}
            </div>
            <div class="history-kpi-value" style="color: var(--success);">${oxMastered.toLocaleString()} <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">คำจำได้แล้ว</span></div>
            <div class="progress-bar-bg" style="height: 6px; margin: 4px 0 2px 0;">
              <div class="progress-bar-fill" style="width: ${oxLearnedPercent}%; background-color: var(--accent);"></div>
            </div>
            <div class="history-kpi-desc">เรียนแล้ว ${oxLearnedPercent}% • ต้องทบทวน ${oxReview.toLocaleString()} คำ</div>
          </div>

          <!-- KPI 3: Timed Exam Sessions -->
          <div class="history-kpi-box">
            <div class="history-kpi-header">
              <span>ประวัติการสอบจำลอง</span>
              ${Icons.history()}
            </div>
            <div class="history-kpi-value">${history.length} <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">รอบการสอบ</span></div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
              ${history.length > 0 ? `สอบล่าสุด: ${Utils.escapeHtml(history[0].subjectName || "")}` : 'ยังไม่เคยบันทึกรอบการสอบ'}
            </div>
            <div class="history-kpi-desc">ระบบบันทึกเวลาและคะแนนอย่างละเอียด</div>
          </div>

          <!-- KPI 4: Bookmarks -->
          <div class="history-kpi-box">
            <div class="history-kpi-header">
              <span>หน้าที่คั่นไว้ใน E-Book</span>
              ${Icons.bookmark()}
            </div>
            <div class="history-kpi-value">${bookmarks.length} <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">หน้า</span></div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
              ${bookmarks.length > 0 ? `ล่าสุด: ${Utils.escapeHtml(bookmarks[0].subjectTitle || "")}` : 'ยังไม่มีหน้าที่คั่นไว้'}
            </div>
            <div class="history-kpi-desc">คลิกเพื่อเปิดอ่านหน้าที่คั่นไว้ได้ทันที</div>
          </div>
        </div>

        <!-- SECTION 1: Oxford 3000 Vocabulary Studio (โยงถึง Oxford 3000 โดยตรง) -->
        <div class="history-oxford-card">
          <div class="history-oxford-header">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h3 style="font-size: var(--font-size-base); font-weight: 700; margin: 0; display: inline-flex; align-items: center; gap: 8px;">
                  ${Icons.layers()} คลังคำศัพท์ภาษาอังกฤษ Oxford 3000 (3,250 คำ)
                </h3>
                <span class="badge badge-accent">Flashcard & Vault</span>
              </div>
              <p style="font-size: var(--font-size-xs); color: var(--text-secondary); margin: 4px 0 0 0;">
                ติดตามและวิเคราะห์ความแม่นยำของคำศัพท์ แบ่งระดับ A1, A2, B1, B2 พร้อมระบบฝึกทบทวนเฉพาะคำ
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              ${oxReview > 0 ? `
                <a href="#oxford?filter=review" class="btn btn-secondary btn-sm" style="color: var(--warning); border-color: var(--warning); display: inline-flex; align-items: center; gap: 6px;" title="เปิดฝึกเฉพาะคำที่ต้องทบทวนใน Flashcard">
                  ${Icons.repeat()} <span>ฝึกคำที่ต้องทวน (${oxReview})</span>
                </a>
              ` : ''}
              <a href="#oxford" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                ${Icons.layers()} <span>เปิดฝึก Flashcards</span>
              </a>
              <a href="#oxford?tab=vault" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                ${Icons.book()} <span>เปิดคลังคำศัพท์ (Vault)</span>
              </a>
            </div>
          </div>

          <!-- Multi-Segment Progress Bar -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
              <span>ความคืบหน้าการเรียนรู้ภาพรวม (${oxLearnedPercent}%)</span>
              <span>${(oxMastered + oxReview).toLocaleString()} / ${oxTotal.toLocaleString()} คำ</span>
            </div>
            <div class="history-multi-bar" title="เขียว = จำได้แล้ว (${oxMasteredPercent}%), ส้ม = ต้องทบทวน (${oxReviewPercent}%), เทา = ยังไม่เคยเจอ">
              <div class="history-multi-bar-seg mastered" style="width: ${oxMasteredPercent}%;"></div>
              <div class="history-multi-bar-seg review" style="width: ${oxReviewPercent}%;"></div>
              <div class="history-multi-bar-seg unseen" style="width: ${Math.max(0, 100 - oxMasteredPercent - oxReviewPercent)}%;"></div>
            </div>
          </div>

          <!-- 3 Stats Pill Row -->
          <div class="history-oxford-pills-row">
            <div class="history-oxford-pill" style="border-left: 3px solid var(--success);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">จำได้แล้ว (Mastered)</span>
                ${Icons.check("text-success")}
              </div>
              <div style="font-size: 18px; font-weight: 800; color: var(--success);">${oxMastered.toLocaleString()} <span style="font-size: 11px; font-weight: 500; color: var(--text-secondary);">คำ (${oxMasteredPercent}%)</span></div>
            </div>

            <div class="history-oxford-pill" style="border-left: 3px solid var(--warning);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">ต้องทบทวน (Review)</span>
                ${Icons.repeat("text-warning")}
              </div>
              <div style="font-size: 18px; font-weight: 800; color: var(--warning);">${oxReview.toLocaleString()} <span style="font-size: 11px; font-weight: 500; color: var(--text-secondary);">คำ (${oxReviewPercent}%)</span></div>
            </div>

            <div class="history-oxford-pill" style="border-left: 3px solid var(--border-light);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">ยังไม่เคยเจอ (Unseen)</span>
                ${Icons.circle("text-muted")}
              </div>
              <div style="font-size: 18px; font-weight: 800; color: var(--text-primary);">${oxUnseen.toLocaleString()} <span style="font-size: 11px; font-weight: 500; color: var(--text-secondary);">คำ (${Math.max(0, 100 - oxMasteredPercent - oxReviewPercent)}%)</span></div>
            </div>
          </div>

          <!-- Levels Breakdown Tags -->
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--border-light); padding-top: 10px; font-size: var(--font-size-xs);">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="color: var(--text-secondary); font-weight: 600;">เลือกระดับคำศัพท์:</span>
              <a href="#oxford?level=A1" class="badge badge-success" style="text-decoration: none;">ระดับ A1 (775 คำ)</a>
              <a href="#oxford?level=A2" class="badge badge-accent" style="text-decoration: none;">ระดับ A2 (736 คำ)</a>
              <a href="#oxford?level=B1" class="badge badge-warning" style="text-decoration: none;">ระดับ B1 (902 คำ)</a>
              <a href="#oxford?level=B2" class="badge badge-danger" style="text-decoration: none;">ระดับ B2 (837 คำ)</a>
            </div>
            <div style="color: var(--text-tertiary); font-size: 11px;">
              คำศัพท์ Oxford 3000 ครบทั้ง 4 ระดับพร้อมกริยา 3 ช่อง
            </div>
          </div>
        </div>

        <!-- SECTION 2: 300-Question Exam Bank Progress by Subject -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-4);">
            <div>
              <h3 style="font-size: var(--font-size-base); font-weight: 700; margin: 0; display: inline-flex; align-items: center; gap: 8px;">
                ${Icons.exam()} ความคืบหน้าคลังข้อสอบ 300 ข้อ รายวิชา (${subjectList.length} วิชา)
              </h3>
              <p style="font-size: var(--font-size-xs); color: var(--text-secondary); margin: 4px 0 0 0;">
                บันทึกสถานะการทำข้อสอบรายข้อ พร้อมสถิติตอบถูก-ตอบผิด ของแต่ละวิชา
              </p>
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">
              ทำแล้วรวม: <strong>${totalAnsweredCount.toLocaleString()}</strong> / ${totalQuestionsPool.toLocaleString()} ข้อ
            </div>
          </div>

          <div class="history-subject-cards-grid">
            ${subjectProgressData.map(s => `
              <div class="history-subject-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                  <div>
                    <span class="badge badge-default" style="font-size: 10px; margin-bottom: 2px;">วิชาที่ ${s.id}</span>
                    <div style="font-weight: 700; font-size: var(--font-size-sm); color: var(--text-primary); line-height: 1.3;">
                      ${Utils.escapeHtml(s.title)}
                    </div>
                  </div>
                  <span class="badge ${s.accuracy >= 60 ? 'badge-success' : (s.answered > 0 ? 'badge-danger' : 'badge-default')}" style="font-size: 11px; flex-shrink: 0;">
                    ${s.answered > 0 ? `แม่นยำ ${s.accuracy}%` : 'ยังไม่เริ่ม'}
                  </span>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">
                    <span>ทำแล้ว ${s.answered} / ${s.total} ข้อ</span>
                    <span>${s.percentage}%</span>
                  </div>
                  <div class="progress-bar-bg" style="height: 6px;">
                    <div class="progress-bar-fill" style="width: ${s.percentage}%;"></div>
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 11px;">
                  <div style="display: flex; gap: 4px;">
                    <span class="badge badge-success" style="padding: 1px 6px; font-size: 10px;">ถูก ${s.correct}</span>
                    <span class="badge badge-danger" style="padding: 1px 6px; font-size: 10px;">ผิด ${s.wrong}</span>
                    <span class="badge badge-default" style="padding: 1px 6px; font-size: 10px;">คงเหลือ ${s.remaining}</span>
                  </div>
                  <a href="#exam?subject=${s.id}" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                    <span>ฝึกทำต่อ</span> ${Icons.chevronRight()}
                  </a>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- SECTION 3: Timed Exam Session History -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-4);">
            <div>
              <h3 style="font-size: var(--font-size-base); font-weight: 700; margin: 0; display: inline-flex; align-items: center; gap: 8px;">
                ${Icons.history()} บันทึกผลการทำข้อสอบแบบจับเวลา (${history.length} ครั้ง)
              </h3>
              <p style="font-size: var(--font-size-xs); color: var(--text-secondary); margin: 4px 0 0 0;">
                ประวัติคะแนนที่ส่งชุดข้อสอบในระบบจำลองการสอบ
              </p>
            </div>
            ${history.length > 0 ? `
              <button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="UI.confirmClearHistory()">
                ล้างประวัติการสอบ
              </button>
            ` : ''}
          </div>

          ${history.length === 0 ? `
            <div style="text-align: center; padding: var(--space-6); color: var(--text-tertiary); font-size: var(--font-size-sm); background-color: var(--bg-subtle); border-radius: var(--radius-md);">
              <p style="margin: 0 0 8px 0;">ยังไม่มีประวัติการส่งชุดข้อสอบแบบจับเวลา</p>
              <a href="#exam" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 4px;">
                ${Icons.exam()} <span>เริ่มทำข้อสอบจับเวลา</span>
              </a>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${history.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background-color: var(--bg-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-light); flex-wrap: wrap; gap: 8px;">
                  <div>
                    <div style="font-weight: 700; font-size: var(--font-size-sm); color: var(--text-primary);">${Utils.escapeHtml(item.subjectName)}</div>
                    <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">
                      ${Utils.formatThaiDate(item.timestamp)} • ใช้เวลา ${Utils.formatTime(item.timeSpent || 0)}
                    </div>
                  </div>
                  <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                    <span class="badge ${item.percentage >= 60 ? 'badge-success' : 'badge-danger'}" style="font-size: var(--font-size-xs); padding: 3px 8px;">
                      ${item.score} / ${item.total} (${item.percentage}%) ${item.percentage >= 60 ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}
                    </span>
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>

        <!-- SECTION 4: Bookmarks Section -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
            <div>
              <h3 style="font-size: var(--font-size-base); font-weight: 700; margin: 0; display: inline-flex; align-items: center; gap: 8px;">
                ${Icons.bookmark()} ที่คั่นหน้าไว้ในเนื้อหาสรุป (${bookmarks.length})
              </h3>
              <p style="font-size: var(--font-size-xs); color: var(--text-secondary); margin: 4px 0 0 0;">
                หน้าที่บันทึกไว้ระหว่างอ่านสรุป เพื่อกลับมาอ่านทบทวนได้อย่างรวดเร็ว
              </p>
            </div>
          </div>

          ${bookmarks.length === 0 ? `
            <div style="text-align: center; padding: var(--space-5); color: var(--text-tertiary); font-size: var(--font-size-sm); background-color: var(--bg-subtle); border-radius: var(--radius-md);">
              <p style="margin: 0 0 8px 0;">ยังไม่มีหน้าที่คั่นไว้</p>
              <a href="#content" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 4px;">
                ${Icons.book()} <span>เปิดอ่านเนื้อหาสรุป</span>
              </a>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-3);">
              ${bookmarks.map(b => `
                <a href="#content?subject=${b.subjectId}&page=${b.pageNum}" class="card" style="padding: var(--space-3); text-decoration: none; display: block; border-left: 3px solid var(--accent); transition: transform var(--transition-fast);">
                  <div style="font-weight: 600; font-size: var(--font-size-xs); color: var(--text-primary);">${Utils.escapeHtml(b.subjectTitle)}</div>
                  <div style="font-size: var(--font-size-xs); color: var(--accent); margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <span>หน้า ${b.pageNum}</span>
                    <span style="font-size: 11px;">เปิดอ่าน ${Icons.chevronRight()}</span>
                  </div>
                </a>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    `;
  },

  confirmClearHistory() {
    if (confirm("คุณต้องการลบประวัติการทำข้อสอบทั้งหมดในเครื่องนี้หรือไม่?\n\n(ข้อมูลคำศัพท์ Oxford และความคืบหน้ารายข้อยังคงอยู่ปลอดภัย)")) {
      ProgressStore.clearExamHistory();
      Utils.showToast("ล้างประวัติการสอบเรียบร้อยแล้ว", "info");
      this.renderHistory(document.getElementById("main-container"));
    }
  },

  /**
   * Render Settings View
   */
  renderSettings(container) {
    const settings = ProgressStore.getSettings();

    container.innerHTML = `
      <div class="reader-container">
        <div style="margin-bottom: var(--space-6);">
          <h2>การตั้งค่า (Settings)</h2>
          <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
            ปรับแต่งรูปแบบการแสดงผลและเวลาเพื่อความสะดวกในการอ่านและการสอบ
          </p>
        </div>

        <div class="settings-group">
          <!-- Theme Setting -->
          <div class="settings-row">
            <div>
              <div class="settings-label">ธีมการแสดงผล (Theme)</div>
              <div class="settings-subtext">ปรับเปลี่ยนโทนสีสว่างหรือมืดตามความสบายตา</div>
            </div>
            <div class="radio-pill-group">
              <button class="radio-pill-btn ${settings.theme === 'light' ? 'active' : ''}" onclick="UI.handleThemeChange('light')">สว่าง</button>
              <button class="radio-pill-btn ${settings.theme === 'sepia' ? 'active' : ''}" onclick="UI.handleThemeChange('sepia')">ถนอมสายตา</button>
              <button class="radio-pill-btn ${settings.theme === 'dark' ? 'active' : ''}" onclick="UI.handleThemeChange('dark')">มืด</button>
              <button class="radio-pill-btn ${settings.theme === 'system' ? 'active' : ''}" onclick="UI.handleThemeChange('system')">ตามระบบ</button>
            </div>
          </div>

          <!-- Font Size Setting -->
          <div class="settings-row">
            <div>
              <div class="settings-label">ขนาดตัวอักษร (Font Size)</div>
              <div class="settings-subtext">ปรับขนาดความใหญ่ของเนื้อหาสำหรับการอ่าน</div>
            </div>
            <div class="radio-pill-group">
              <button class="radio-pill-btn ${settings.fontSize === 'small' ? 'active' : ''}" onclick="UI.handleFontSizeChange('small')">เล็ก</button>
              <button class="radio-pill-btn ${settings.fontSize === 'normal' ? 'active' : ''}" onclick="UI.handleFontSizeChange('normal')">ปกติ</button>
              <button class="radio-pill-btn ${settings.fontSize === 'large' ? 'active' : ''}" onclick="UI.handleFontSizeChange('large')">ใหญ่</button>
              <button class="radio-pill-btn ${settings.fontSize === 'xlarge' ? 'active' : ''}" onclick="UI.handleFontSizeChange('xlarge')">ใหญ่พิเศษ</button>
            </div>
          </div>

          <!-- Timer Default Setting -->
          <div class="settings-row">
            <div>
              <div class="settings-label">เวลาสอบมาตรฐาน (นาที)</div>
              <div class="settings-subtext">เวลานับถอยหลังเริ่มต้นสำหรับชุดข้อสอบ</div>
            </div>
            <select class="input-text" style="width: 110px; padding: 4px 8px;" onchange="UI.handleTimerChange(this.value)">
              <option value="10" ${settings.timerMinutes === 10 ? 'selected' : ''}>10 นาที</option>
              <option value="15" ${settings.timerMinutes === 15 ? 'selected' : ''}>15 นาที</option>
              <option value="20" ${settings.timerMinutes === 20 ? 'selected' : ''}>20 นาที</option>
              <option value="30" ${settings.timerMinutes === 30 ? 'selected' : ''}>30 นาที</option>
            </select>
          </div>

          <!-- Mock Sets Recycling Setting -->
          <div class="settings-row">
            <div>
              <div class="settings-label">การสร้างชุดข้อสอบจำลอง (Mock Sets Recycling)</div>
              <div class="settings-subtext">อนุญาตให้หมุนเวียนข้อสอบซ้ำเมื่อสร้างชุดเกินขีดจำกัดสูงสุดที่ไม่ซ้ำกันในคลัง (ระบบคำนวณตามจำนวนข้อสอบจริง)</div>
            </div>
            <div class="radio-pill-group">
              <button class="radio-pill-btn ${!settings.allowRecycleMockSets ? 'active' : ''}" onclick="UI.handleMockRecycleChange(false)">ไม่ซ้ำกันเท่านั้น</button>
              <button class="radio-pill-btn ${settings.allowRecycleMockSets ? 'active' : ''}" onclick="UI.handleMockRecycleChange(true)">หมุนเวียนซ้ำได้</button>
            </div>
          </div>
        </div>

        <!-- Centralized Speech & Pronunciation Settings -->
        <div class="settings-group">
          <div style="padding-bottom: var(--space-2); margin-bottom: var(--space-4); border-bottom: 1px solid var(--border-light);">
            <h3 style="font-size: var(--font-size-base); font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              ${Icons.volume()} การตั้งค่าเสียงอ่าน (Speech & Audio)
            </h3>
            <p style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-top: 4px;">
              ตั้งค่าเสียงอ่านออกเสียงคำศัพท์และประโยคภาษาอังกฤษ (สำหรับ Oxford 3000 และแบบฝึกหัดในระบบ)
            </p>
          </div>

          <!-- Voice Selector -->
          <div class="settings-row">
            <div>
              <div class="settings-label">เลือกเสียงอ่าน (Voice / Accent)</div>
              <div class="settings-subtext">ระบบตั้งค่าเริ่มต้นเป็นเสียง Google (ผู้หญิง) หรือเสียงมาตรฐานของอุปกรณ์โดยอัตโนมัติ</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; max-width: 320px; width: 100%;">
              <select id="setting-voice-select" class="input-text" style="flex: 1; padding: 6px 10px; font-size: 12px;" onchange="UI.handleVoiceChange(this.value)">
                <option value="">กำลังโหลดเสียงจากระบบ...</option>
              </select>
              <button class="btn btn-secondary btn-icon-sm" onclick="AudioManager.testVoice()" title="ทดสอบฟังเสียง">
                ${Icons.volume()}
              </button>
            </div>
          </div>

          <!-- Speed Rate -->
          <div class="settings-row">
            <div>
              <div class="settings-label">ความเร็วเสียงอ่าน (Speech Rate)</div>
              <div class="settings-subtext">ปรับระดับความเร็วในการออกเสียงคำศัพท์และประโยค (1.0x ปกติ = 0.85)</div>
            </div>
            <div class="radio-pill-group">
              <button class="radio-pill-btn ${(settings.audioRate === 0.65 || settings.audioRate === 0.75) ? 'active' : ''}" onclick="UI.handleAudioRateChange(0.65, '0.75x (ช้า)')">0.75x (ช้า)</button>
              <button class="radio-pill-btn ${(!settings.audioRate || settings.audioRate === 0.85 || settings.audioRate === 1.0) ? 'active' : ''}" onclick="UI.handleAudioRateChange(0.85, '1.0x (ปกติ)')">1.0x (ปกติ)</button>
              <button class="radio-pill-btn ${(settings.audioRate === 1.10 || settings.audioRate === 1.25) ? 'active' : ''}" onclick="UI.handleAudioRateChange(1.10, '1.25x (เร็ว)')">1.25x (เร็ว)</button>
            </div>
          </div>
        </div>

        <!-- Data Reset Section -->
        <div class="card" style="border-color: var(--danger-subtle); background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(220, 53, 69, 0.02) 100%);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-3);">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span class="badge" style="background: rgba(220, 53, 69, 0.12); color: var(--danger); border: 1px solid rgba(220, 53, 69, 0.25); font-size: 11px;">
                  DATA MANAGEMENT
                </span>
              </div>
              <h3 style="font-size: var(--font-size-base); font-weight: 700; color: var(--danger); margin: 0 0 4px 0;">
                จัดการและรีเซ็ตข้อมูลในระบบ
              </h3>
              <p style="font-size: var(--font-size-xs); color: var(--text-secondary); margin: 0; line-height: 1.5;">
                จัดการข้อมูลที่บันทึกไว้ในเครื่อง เช่น ประวัติคะแนนสอบ, คำตอบรายข้อ, คำศัพท์ Oxford 3000, ที่คั่นหน้า หรือคืนค่าระบบ
              </p>
            </div>
          </div>

          <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px dashed var(--border-light);">
            <button class="btn btn-primary" onclick="UI.openSelectiveResetModal()" style="display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(26, 86, 219, 0.25);">
              ${Icons.checkSquare ? Icons.checkSquare() : Icons.check()}
              <span>เลือกรีเซ็ตข้อมูลเฉพาะส่วน...</span>
            </button>
            <button class="btn btn-outline" style="color: var(--danger); border-color: var(--danger); display: inline-flex; align-items: center; gap: 8px;" onclick="UI.confirmResetAll()">
              ${Icons.trash ? Icons.trash() : Icons.close()}
              <span>รีเซ็ตข้อมูลทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Populate voices in dropdown
    setTimeout(() => this.populateVoiceDropdown(), 20);
  },

  populateVoiceDropdown() {
    const sel = document.getElementById("setting-voice-select");
    if (!sel || typeof AudioManager === "undefined") return;

    const voices = AudioManager.getAvailableVoices();
    const settings = ProgressStore.getSettings();
    const defaultVoice = AudioManager.getDefaultVoice();

    sel.innerHTML = "";

    if (voices.length === 0) {
      sel.innerHTML = `<option value="">ค่าเริ่มต้นระบบ (Standard English)</option>`;
      return;
    }

    voices.forEach(voice => {
      const opt = document.createElement("option");
      opt.value = voice.name;
      const isDefault = defaultVoice && defaultVoice.name === voice.name;
      opt.textContent = `${voice.name} (${voice.lang})${isDefault ? ' [ค่าเริ่มต้น Google/หญิง]' : ''}`;

      if (settings.audioVoice) {
        if (settings.audioVoice === voice.name) opt.selected = true;
      } else if (isDefault) {
        opt.selected = true;
      }

      sel.appendChild(opt);
    });
  },

  handleVoiceChange(voiceName) {
    const settings = ProgressStore.getSettings();
    settings.audioVoice = voiceName;
    ProgressStore.saveSettings(settings);
    Utils.showToast("บันทึกเสียงอ่านเรียบร้อยแล้ว", "success");
    if (typeof AudioManager !== "undefined") {
      AudioManager.testVoice(voiceName);
    }
  },

  handleAudioRateChange(rate, label = null) {
    const settings = ProgressStore.getSettings();
    settings.audioRate = parseFloat(rate) || 0.85;
    ProgressStore.saveSettings(settings);
    this.renderSettings(document.getElementById("main-container"));
    const displayLabel = label || (rate === 0.85 ? "1.0x (ปกติ)" : (rate === 0.65 ? "0.75x (ช้า)" : "1.25x (เร็ว)"));
    Utils.showToast(`ปรับความเร็วเสียงเป็น ${displayLabel}`, "info");
    if (typeof AudioManager !== "undefined") {
      AudioManager.testVoice(null, rate);
    }
  },

  handleThemeChange(theme) {
    this.setTheme(theme);
    this.renderSettings(document.getElementById("main-container"));
  },

  handleFontSizeChange(size) {
    this.setFontSize(size);
    this.renderSettings(document.getElementById("main-container"));
  },

  handleTimerChange(minutes) {
    const settings = ProgressStore.getSettings();
    settings.timerMinutes = parseInt(minutes, 10) || 20;
    ProgressStore.saveSettings(settings);
    Utils.showToast(`บันทึกเวลาสอบเริ่มต้น: ${settings.timerMinutes} นาที`, "info");
  },

  handleMockRecycleChange(allow) {
    const settings = ProgressStore.getSettings();
    settings.allowRecycleMockSets = !!allow;
    ProgressStore.saveSettings(settings);
    this.renderSettings(document.getElementById("main-container"));
    Utils.showToast(
      allow ? "เปิดใช้งานการหมุนเวียนข้อสอบซ้ำสำหรับชุดจำลองแล้ว" : "ตั้งค่าจำกัดเฉพาะข้อสอบที่ไม่ซ้ำกันในคลังแล้ว",
      "info"
    );
  },

  confirmResetAll() {
    if (confirm("คำเตือน: คุณต้องการลบข้อมูลทั้งหมดรวมถึงที่คั่นหน้าและประวัติสอบหรือไม่?")) {
      ProgressStore.resetAllData();
      Utils.showToast("รีเซ็ตข้อมูลเรียบร้อยแล้ว", "warning");
      this.initTheme();
      this.renderSettings(document.getElementById("main-container"));
    }
  },

  /* --- Selective Data Reset Modal --- */
  openSelectiveResetModal() {
    // Remove any previous instance if open
    const prev = document.getElementById("selective-reset-modal-overlay");
    if (prev && prev.parentNode) {
      prev.parentNode.removeChild(prev);
    }

    const categories = ProgressStore.getDataCategoriesStatus();
    const iconMap = {
      history: Icons.history ? Icons.history() : "",
      checkSquare: Icons.checkSquare ? Icons.checkSquare() : (Icons.check ? Icons.check() : ""),
      clock: Icons.clock ? Icons.clock() : "",
      layers: Icons.layers ? Icons.layers() : "",
      bookmark: Icons.bookmark ? Icons.bookmark() : "",
      book: Icons.book ? Icons.book() : "",
      settings: Icons.settings ? Icons.settings() : ""
    };

    const cardsHtml = categories.map(cat => {
      const iconSvg = iconMap[cat.icon] || (Icons.exam ? Icons.exam() : "");
      return `
        <div class="reset-item-card" id="card-${cat.key}" data-key="${cat.key}" onclick="UI.handleCardClick(event, '${cat.key}')">
          <div class="reset-item-checkbox-col">
            <input type="checkbox" id="reset-chk-${cat.key}" value="${cat.key}" class="reset-checkbox" onchange="UI.updateResetSelectionCount()">
            <div class="custom-check-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <div class="reset-item-icon-col">
            <div class="reset-cat-icon icon-${cat.badgeType}">
              ${iconSvg}
            </div>
          </div>
          <div class="reset-item-info-col">
            <div class="reset-item-header">
              <span class="reset-item-title">${Utils.escapeHtml(cat.title)}</span>
              <span class="badge badge-${cat.badgeType} reset-item-badge">${Utils.escapeHtml(cat.countText)}</span>
            </div>
            <div class="reset-item-desc">${Utils.escapeHtml(cat.desc)}</div>
            <div class="reset-item-sub">${Utils.escapeHtml(cat.subtitle)}</div>
          </div>
        </div>
      `;
    }).join("");

    const overlay = document.createElement("div");
    overlay.id = "selective-reset-modal-overlay";
    overlay.className = "selective-reset-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "reset-modal-main-title");

    overlay.innerHTML = `
      <div class="selective-reset-modal" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="reset-modal-header">
          <div class="reset-modal-title-wrapper">
            <div class="reset-modal-icon-badge">
              ${Icons.sliders ? Icons.sliders() : Icons.settings()}
            </div>
            <div>
              <h3 id="reset-modal-main-title" class="reset-modal-title">เลือกรีเซ็ตข้อมูลในระบบ</h3>
              <p class="reset-modal-subtitle">เลือกติ๊กหมวดหมู่ข้อมูลที่ต้องการล้าง ข้อมูลส่วนที่ไม่ได้เลือกจะยังคงอยู่ปลอดภัย</p>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon-sm" onclick="UI.closeSelectiveResetModal()" title="ปิด" aria-label="ปิด">
            ${Icons.close ? Icons.close() : ""}
          </button>
        </div>

        <!-- Toolbar -->
        <div class="reset-modal-toolbar">
          <div class="reset-toolbar-actions">
            <button type="button" class="btn btn-sm btn-secondary" onclick="UI.toggleSelectAllReset(true)" style="display: inline-flex; align-items: center; gap: 4px;">
              ${Icons.check ? Icons.check() : ""} เลือกทั้งหมด (${categories.length})
            </button>
            <button type="button" class="btn btn-sm btn-ghost" onclick="UI.toggleSelectAllReset(false)" style="display: inline-flex; align-items: center; gap: 4px;">
              ${Icons.close ? Icons.close() : ""} ยกเลิกทั้งหมด
            </button>
          </div>
          <div class="reset-counter-badge" id="reset-counter-badge">
            เลือกแล้ว <b id="reset-selected-count">0</b> จาก ${categories.length} หมวดหมู่
          </div>
        </div>

        <!-- Cards List -->
        <div class="reset-modal-body">
          ${cardsHtml}
        </div>

        <!-- Footer -->
        <div class="reset-modal-footer">
          <div class="reset-footer-note">
            ${Icons.alertTriangle ? Icons.alertTriangle() : ""} ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนกลับมาได้
          </div>
          <div class="reset-footer-actions">
            <button type="button" class="btn btn-secondary" onclick="UI.closeSelectiveResetModal()">
              ยกเลิก
            </button>
            <button type="button" id="btn-confirm-selective-reset" class="btn btn-danger" onclick="UI.executeSelectiveReset()" disabled style="display: inline-flex; align-items: center; gap: 6px;">
              ${Icons.trash ? Icons.trash() : ""}
              <span>ล้างข้อมูลที่เลือก (<span id="reset-confirm-num">0</span>)</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Click outside overlay to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.closeSelectiveResetModal();
      }
    });

    // Escape key to close
    const escHandler = (e) => {
      if (e.key === "Escape") {
        this.closeSelectiveResetModal();
        window.removeEventListener("keydown", escHandler);
      }
    };
    window.addEventListener("keydown", escHandler);

    document.body.appendChild(overlay);
    this.updateResetSelectionCount();
  },

  closeSelectiveResetModal() {
    const overlay = document.getElementById("selective-reset-modal-overlay");
    if (overlay) {
      overlay.classList.add("fade-out");
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 150);
    }
  },

  handleCardClick(event, key) {
    if (event.target && event.target.tagName.toLowerCase() === "input") {
      return;
    }
    const chk = document.getElementById(`reset-chk-${key}`);
    if (chk) {
      chk.checked = !chk.checked;
      this.updateResetSelectionCount();
    }
  },

  updateResetSelectionCount() {
    const checkboxes = document.querySelectorAll(".selective-reset-modal .reset-checkbox");
    let count = 0;
    checkboxes.forEach(chk => {
      const card = document.getElementById(`card-${chk.value}`);
      if (chk.checked) {
        count++;
        if (card) card.classList.add("is-checked");
      } else {
        if (card) card.classList.remove("is-checked");
      }
    });

    const countEl = document.getElementById("reset-selected-count");
    if (countEl) countEl.textContent = count;

    const confirmNumEl = document.getElementById("reset-confirm-num");
    if (confirmNumEl) confirmNumEl.textContent = count;

    const confirmBtn = document.getElementById("btn-confirm-selective-reset");
    if (confirmBtn) {
      confirmBtn.disabled = count === 0;
    }
  },

  toggleSelectAllReset(selectAll) {
    const checkboxes = document.querySelectorAll(".selective-reset-modal .reset-checkbox");
    checkboxes.forEach(chk => {
      chk.checked = !!selectAll;
    });
    this.updateResetSelectionCount();
  },

  executeSelectiveReset() {
    const checkboxes = document.querySelectorAll(".selective-reset-modal .reset-checkbox:checked");
    const selectedKeys = Array.from(checkboxes).map(chk => chk.value);

    if (selectedKeys.length === 0) {
      Utils.showToast("กรุณาเลือกหมวดหมู่ที่ต้องการล้างอย่างน้อย 1 รายการ", "warning");
      return;
    }

    const categories = ProgressStore.getDataCategoriesStatus();
    const names = selectedKeys.map(k => {
      const item = categories.find(c => c.key === k);
      return item ? item.title : k;
    });

    const confirmMessage = `ยืนยันการล้างข้อมูล ${selectedKeys.length} หมวดหมู่นี้หรือไม่?\n\n• ${names.join("\n• ")}\n\n* ข้อมูลส่วนที่เลือกจะถูกลบถาวรทันที`;
    if (!confirm(confirmMessage)) {
      return;
    }

    ProgressStore.resetSpecificData(selectedKeys);

    // If settings was among cleared, re-init theme & font size
    if (selectedKeys.includes(ProgressStore.KEYS.SETTINGS)) {
      this.initTheme();
    }

    this.closeSelectiveResetModal();
    Utils.showToast(`ล้างข้อมูล ${selectedKeys.length} หมวดหมู่เรียบร้อยแล้ว`, "success");

    // Re-render current settings page to reflect updated live data
    const mainContainer = document.getElementById("main-container");
    if (mainContainer) {
      this.renderSettings(mainContainer);
    }
  }
};

if (typeof window !== "undefined") {
  window.UI = UI;
}
