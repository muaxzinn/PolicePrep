/**
 * PDFViewer Module
 * Provides seamless in-app PDF viewing with fallback and document catalog
 */
const PDFViewer = {
  currentPdf: null,
  container: null,

  async init(container, targetFile = null) {
    this.container = container;
    const pdfs = await DataLoader.loadPDFList();

    if (targetFile) {
      this.currentPdf = pdfs.find(p => p.filename === targetFile || p.file_path === targetFile) || pdfs[0];
    } else if (!this.currentPdf && pdfs.length > 0) {
      this.currentPdf = pdfs[0];
    }

    this.render(pdfs);
  },

  render(pdfs) {
    if (!pdfs || pdfs.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <div class="empty-state-title">ไม่พบไฟล์ PDF ในระบบ</div>
        </div>
      `;
      return;
    }

    const current = this.currentPdf || pdfs[0];
    const encodedFilePath = encodeURI(current.file_path);

    let docOptions = pdfs.map(p => `
      <option value="${Utils.escapeHtml(p.filename)}" ${p.filename === current.filename ? 'selected' : ''}>
        ${p.subject_id}. ${Utils.escapeHtml(p.filename)} (${p.size_mb} MB)
      </option>
    `).join("");

    this.container.innerHTML = `
      <div class="full-bleed-container">
        <!-- PDF Viewer Wrapper -->
        <div class="pdf-viewer-wrapper">
          <!-- Toolbar -->
          <div class="pdf-toolbar">
            <div style="flex: 1; min-width: 240px; display: flex; align-items: center; gap: var(--space-2);">
              <span style="color: var(--text-secondary); font-size: var(--font-size-xs); font-weight: 600;">เอกสาร:</span>
              <select class="input-text" style="padding-left: 0.5rem;" onchange="PDFViewer.switchDocument(this.value)">
                ${docOptions}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <a href="${encodedFilePath}" download class="btn btn-secondary btn-sm" title="ดาวน์โหลดไฟล์ PDF เก็บไว้">
                ${Icons.download()} <span>ดาวน์โหลด</span>
              </a>
              <a href="${encodedFilePath}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="เปิดในแท็บใหม่แบบเต็มจอ">
                ${Icons.externalLink()} <span>เปิดแท็บใหม่</span>
              </a>
            </div>
          </div>

          <!-- PDF Viewport with Native Viewer Fallback -->
          <div class="pdf-viewport" id="pdf-viewport">
            <iframe 
              src="${encodedFilePath}#toolbar=1&navpanes=1&scrollbar=1&view=FitH" 
              class="pdf-iframe" 
              title="${Utils.escapeHtml(current.filename)}"
              loading="lazy"
            >
              <div style="padding: 2rem; color: #FFF; text-align: center;">
                <p>เบราว์เซอร์ของคุณไม่รองรับการแสดงผล PDF ในหน้าเว็บโดยตรง</p>
                <a href="${encodedFilePath}" class="btn btn-primary" style="margin-top: 1rem;">ดาวน์โหลดเพื่อเปิดดู</a>
              </div>
            </iframe>
          </div>
        </div>

        <!-- Document Info & Quick Switch Grid -->
        <div style="margin-top: var(--space-6);">
          <h3 style="font-size: var(--font-size-md); margin-bottom: var(--space-3);">รายการเอกสาร PDF ทั้งหมด (${pdfs.length} เล่ม)</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3);">
            ${pdfs.map(p => `
              <div class="card" style="padding: var(--space-3) var(--space-4); display: flex; align-items: center; justify-content: space-between; cursor: pointer; ${p.filename === current.filename ? 'border-color: var(--accent); background-color: var(--accent-subtle);' : ''}" onclick="PDFViewer.switchDocument('${Utils.escapeHtml(p.filename)}')">
                <div style="display: flex; align-items: center; gap: var(--space-3); min-width: 0;">
                  <span style="color: var(--accent);">${Icons.pdf()}</span>
                  <div style="min-width: 0;">
                    <div style="font-size: var(--font-size-xs); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">${Utils.escapeHtml(p.filename)}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">${p.size_mb} MB</div>
                  </div>
                </div>
                ${p.filename === current.filename ? `<span class="badge badge-accent">กำลังอ่าน</span>` : ''}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  },

  async switchDocument(filename) {
    const pdfs = await DataLoader.loadPDFList();
    this.currentPdf = pdfs.find(p => p.filename === filename);
    this.render(pdfs);
  }
};

if (typeof window !== "undefined") {
  window.PDFViewer = PDFViewer;
}
