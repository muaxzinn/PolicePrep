/**
 * App Main Module
 * Orchestrates routes, dashboard view, global search, and application lifecycle
 */
const App = {
  async init() {
    console.log("Initializing Minimal Exam Preparation Platform...");
    
    // 1. Initialize Theme & UI
    UI.initTheme();

    // 2. Preload Manifest
    const manifest = await DataLoader.loadManifest();

    // 3. Register Routes
    Router.register("dashboard", (container) => this.renderDashboard(container, manifest));
    Router.register("content", (container, params) => {
      const subject = params.get("subject") || "01";
      const page = params.get("page") || 1;
      ContentRenderer.init(container, subject, page);
    });
    Router.register("pdf", (container, params) => {
      const file = params.get("file") || null;
      PDFViewer.init(container, file);
    });
    Router.register("exam", (container, params) => {
      ExamEngine.init(container, params);
    });
    Router.register("official", (container) => {
      OfficialLinks.init(container);
    });
    Router.register("history", (container) => {
      UI.renderHistory(container);
    });
    Router.register("settings", (container) => {
      UI.renderSettings(container);
    });
    Router.register("oxford", (container, params) => {
      OxfordEngine.init(container, params);
    });

    // 4. Start Router
    Router.init();
  },

  renderDashboard(container, manifest) {
    const contentModules = manifest.content_modules || [];
    const examModules = manifest.exam_modules || [];
    const lastReadMap = ProgressStore.getLastRead();
    const historyList = ProgressStore.getExamHistory();
    const latestExam = historyList[0] || null;

    // Check if there is a resume point
    let resumeHtml = "";
    const lastReadKeys = Object.keys(lastReadMap);
    if (lastReadKeys.length > 0) {
      const lastSubId = lastReadKeys[0];
      const lastInfo = lastReadMap[lastSubId];
      const subObj = contentModules.find(m => m.id === lastSubId);
      if (subObj) {
        resumeHtml = `
          <div class="card" style="border-left: 4px solid var(--accent); margin-bottom: var(--space-6); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
            <div>
              <span class="badge badge-accent">อ่านต่อล่าสุด</span>
              <h3 style="font-size: var(--font-size-base); margin-top: 4px;">${Utils.escapeHtml(subObj.title)} (หน้า ${lastInfo.pageNum})</h3>
              <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">${Utils.formatThaiDate(lastInfo.timestamp)}</div>
            </div>
            <a href="#content?subject=${lastSubId}&page=${lastInfo.pageNum}" class="btn btn-primary btn-sm">
              เปิดอ่านต่อ ${Icons.chevronRight()}
            </a>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <div>
        <!-- Hero Section -->
        <section class="dashboard-hero">
          <h1>PolicePrep® — ระบบเตรียมสอบตำรวจ</h1>
          <p>แพลตฟอร์มทบทวนเนื้อหาสรุป 8 วิชา คลังข้อสอบวิเคราะห์เชิงลึก เอกสาร PDF ข้อสอบทางการ และ Oxford 3000</p>
        </section>

        <!-- Quick Stats Row -->
        <div class="quick-stats-row">
          <div class="stat-card">
            <div class="stat-icon-wrapper">${Icons.book()}</div>
            <div>
              <div class="stat-number">${contentModules.length}</div>
              <div class="stat-label">หมวดวิชา (${contentModules.reduce((acc, m) => acc + (m.pages_count || 0), 0)} หน้า)</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper" style="background-color: var(--success-subtle); color: var(--success);">${Icons.exam()}</div>
            <div>
              <div class="stat-number">${examModules.reduce((acc, m) => acc + (m.question_count || 0), 0).toLocaleString()}</div>
              <div class="stat-label">ข้อสอบวิเคราะห์เชิงลึก (300 ข้อ/วิชา)</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper" style="background-color: var(--warning-subtle); color: var(--warning);">${Icons.pdf()}</div>
            <div>
              <div class="stat-number">${(manifest.pdf_documents || []).length}</div>
              <div class="stat-label">เอกสาร PDF ต้นฉบับ</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper" style="background-color: var(--info-subtle); color: var(--info);">${Icons.official()}</div>
            <div>
              <div class="stat-number">${(manifest.official_exams || []).length}</div>
              <div class="stat-label">ลิงก์ข้อสอบทางการ (QR)</div>
            </div>
          </div>
        </div>

        ${resumeHtml}

        <!-- Oxford 3000 Flashcard Studio Banner -->
        <section class="card" style="margin-bottom: var(--space-6); background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-elevated) 100%); border-left: 4px solid var(--accent); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4);">
          <div style="flex: 1; min-width: 260px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="badge badge-accent" style="font-size: 10px;">STUDIO</span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 10px;">CEFR A1–B2</span>
            </div>
            <h3 style="font-size: var(--font-size-md); font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">
              Oxford 3000 Flashcard Studio & Vocabulary Bank
            </h3>
            <p style="color: var(--text-secondary); font-size: var(--font-size-xs); margin: 0; line-height: 1.5;">
              ระบบฝึกคำศัพท์ภาษาอังกฤษครบ 3,000 คำมาตรฐาน การ์ด 3D พลิกดูคำแปลไทย พร้อมตัวอย่าง ประโยคบริบท และเสียงอ่าน Web Speech API
            </p>
          </div>
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
            <a href="#oxford?tab=flashcard" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              ${Icons.layers()} <span>เรียน Flashcard</span>
            </a>
            <a href="#oxford?tab=vault" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              ${Icons.book()} <span>คลังคำศัพท์ (Bank)</span>
            </a>
          </div>
        </section>

        <!-- 8 Modules Grid -->
        <section>
          <div class="section-heading">
            <h2 class="section-title">หมวดวิชาเตรียมสอบทั้ง 8 หมวด</h2>
            <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">คลิกเพื่อเลือกอ่านเนื้อหาหรือทำข้อสอบ</span>
          </div>

          <div class="module-grid">
            ${contentModules.map(mod => {
              const examMod = examModules.find(e => e.id === mod.id);
              const qCount = examMod ? examMod.question_count : 0;

              return `
                <div class="module-card">
                  <div>
                    <div class="module-card-header">
                      <span class="module-code">หมวด ${mod.id}</span>
                      <span class="badge badge-default">${mod.pages_count} หน้า</span>
                    </div>
                    <h3 class="module-title">${Utils.escapeHtml(mod.title)}</h3>
                  </div>

                  <div>
                    <div style="display: flex; gap: var(--space-2); margin-top: var(--space-4);">
                      <a href="#content?subject=${mod.id}" class="btn btn-secondary btn-sm" style="flex: 1;" title="อ่านเนื้อหาสรุป">
                        ${Icons.book()} <span>อ่านสรุป</span>
                      </a>
                      <a href="#exam?subject=${mod.id}" class="btn btn-primary btn-sm" style="flex: 1;" title="ทำข้อสอบจำลอง">
                        ${Icons.exam()} <span>ทำข้อสอบ (${qCount})</span>
                      </a>
                    </div>

                    ${mod.id === '03' ? `
                      <a href="#oxford" class="btn btn-outline btn-sm" style="margin-top: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;" title="ฝึกคำศัพท์ Oxford 3000">
                        ${Icons.layers()} <span>Oxford 3000 Studio</span>
                      </a>
                    ` : ''}

                    ${mod.linked_pdf ? `
                      <div class="module-meta">
                        <a href="#pdf?file=${encodeURIComponent(mod.linked_pdf)}" style="display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 11px;">
                          ${Icons.pdf()} <span>PDF ต้นฉบับ</span>
                        </a>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>

        <!-- Official Shortcuts Banner -->
        <section class="card" style="margin-top: var(--space-8); background-color: var(--bg-surface); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4);">
          <div>
            <h3 style="font-size: var(--font-size-md); margin-bottom: 4px;">คลังข้อสอบทางการผ่าน QR Code</h3>
            <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin: 0;">
              เข้าสู่ระบบฝึกทำข้อสอบทั้ง 6 วิชาบนเว็บทางการที่สแกนจากเอกสารสรุป
            </p>
          </div>
          <a href="#official" class="btn btn-outline btn-sm">
            ${Icons.official()} ดูลิงก์ข้อสอบทางการทั้งหมด
          </a>
        </section>
      </div>
    `;

    // Trigger mobile install floating prompt if not running in standalone mode
    if (typeof PWAInstaller !== "undefined") {
      setTimeout(() => PWAInstaller.checkAndRender(), 100);
    }
  }
};

if (typeof window !== "undefined") {
  window.App = App;
}

window.addEventListener("DOMContentLoaded", () => {
  App.init();
});
