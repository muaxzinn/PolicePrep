/**
 * OfficialLinks Module
 * Renders the verified official mock exam portals scanned from QR codes
 */
const OfficialLinks = {
  async init(container) {
    this.container = container;
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <p style="margin-top: 1rem;">กำลังโหลดรายการลิงก์ทางการ...</p>
      </div>
    `;

    try {
      const links = await DataLoader.loadOfficialExams();
      this.render(links);
    } catch (err) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">ไม่สามารถโหลดข้อมูลลิงก์ทางการได้</div>
          <div class="empty-state-desc">${Utils.escapeHtml(err.message)}</div>
        </div>
      `;
    }
  },

  render(links) {
    this.container.innerHTML = `
      <div class="reader-container">
        <div style="margin-bottom: var(--space-6);">
          <h2 style="margin-bottom: var(--space-2);">คลังข้อสอบและแบบฝึกหัดทางการ (Official Exam Portals)</h2>
          <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
            รวมลิงก์แบบฝึกหัดและข้อสอบออนไลน์ที่ได้จากการสแกน QR Code ต้นฉบับทั้ง 6 หมวดวิชา โดยสามารถเปิดทดสอบบนเว็บไซต์ทางการต้นฉบับได้ทันที
          </p>
        </div>

        <div class="official-grid">
          ${links.map((item, idx) => `
            <div class="card official-card">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
                  <span class="badge badge-accent">วิชาที่ ${idx + 1}</span>
                  <span class="badge badge-success">ลิงก์ยืนยันแล้ว</span>
                </div>
                <h3 class="official-card-title">${Utils.escapeHtml(item.subject)}</h3>
                <div class="official-card-desc">
                  <div><strong>ที่มา QR:</strong> ${Utils.escapeHtml(item.image_file)}</div>
                  <div style="margin-top: 4px; color: var(--text-tertiary);">ปลายทาง: ${Utils.escapeHtml(item.destination_url)}</div>
                </div>
              </div>

              <div style="display: flex; gap: var(--space-2); margin-top: var(--space-4);">
                <a 
                  href="${Utils.escapeHtml(item.destination_url)}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="btn btn-primary btn-sm"
                  style="flex: 1;"
                >
                  ${Icons.externalLink()} <span>เข้าสู่เว็บไซต์ข้อสอบ</span>
                </a>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }
};

if (typeof window !== "undefined") {
  window.OfficialLinks = OfficialLinks;
}
