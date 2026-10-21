/**
 * ExplanationRenderer Module
 * Formats deep 9-section explanations with interactive accordions and math parsing
 */
const ExplanationRenderer = {
  /**
   * Render complete deep explanation card for a question
   */
  renderExplanation(q, isReview = false) {
    if (!q) return "";

    const stepsHtml = (q.reasoning_steps || []).map(s => `
      <li style="margin-bottom: 6px;">${MathRenderer.formatMathString(Utils.escapeHtml(s))}</li>
    `).join("");

    let optionsAnalysisHtml = "";
    if (q.option_analysis) {
      optionsAnalysisHtml = Object.entries(q.option_analysis).map(([label, text]) => {
        const isCorrect = label === q.correct_answer;
        const badgeClass = isCorrect ? "badge-success" : "badge-default";
        return `
          <div style="margin-bottom: 8px; padding: 6px 10px; border-radius: var(--radius-sm); background-color: ${isCorrect ? 'var(--success-subtle)' : 'var(--bg-subtle)'};">
            <span class="badge ${badgeClass}" style="margin-right: 6px;">ตัวเลือก ${label}</span>
            <span style="font-size: var(--font-size-sm);">${MathRenderer.formatMathString(Utils.escapeHtml(text))}</span>
          </div>
        `;
      }).join("");
    }

    const takeawaysHtml = (q.key_takeaways || []).map(t => `
      <li>${MathRenderer.formatMathString(Utils.escapeHtml(t))}</li>
    `).join("");

    const src = q.source_references || {};
    const sourceHtml = `
      <div style="font-size: var(--font-size-xs); color: var(--text-secondary); background-color: var(--bg-subtle); padding: 8px 12px; border-radius: var(--radius-sm); margin-top: 8px;">
        <strong>เอกสารอ้างอิง:</strong> ${Utils.escapeHtml(src.file || "")} | <strong>หน้า:</strong> ${src.page || "-"} | <em>"${Utils.escapeHtml(src.citation || "")}"</em>
      </div>
    `;

    return `
      <div class="deep-explanation-container" id="explanation-${q.id}">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="badge badge-success" style="font-size: var(--font-size-sm); padding: 4px 10px;">เฉลยข้อ ${q.correct_answer}</span>
            <span style="font-size: var(--font-size-xs); color: var(--text-secondary);">ความยากระดับ ${q.difficulty_level}/5 (${Utils.escapeHtml(q.question_pattern || "")})</span>
          </div>
        </div>

        <!-- 5.2 Concept Tested -->
        <div class="explanation-section">
          <h4>${Icons.check()} 1. ประเด็นที่โจทย์ต้องการวัด</h4>
          <p>${MathRenderer.formatMathString(Utils.escapeHtml(q.concept_tested || ""))}</p>
        </div>

        <!-- 5.3 Source Principle -->
        <div class="explanation-section">
          <h4>${Icons.book()} 2. หลักการจากต้นฉบับ</h4>
          <p style="background-color: var(--bg-subtle); padding: 8px 12px; border-left: 3px solid var(--accent); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
            ${MathRenderer.formatMathString(Utils.escapeHtml(q.source_principle || ""))}
          </p>
        </div>

        <!-- 5.4 Reasoning Steps -->
        <div class="explanation-section">
          <h4>3. ขั้นตอนการวิเคราะห์อย่างเป็นระบบ (Step-by-Step)</h4>
          <ol style="padding-left: 20px;">
            ${stepsHtml}
          </ol>
        </div>

        <!-- 5.5 Option Analysis -->
        <div class="explanation-section">
          <h4>4. วิเคราะห์ตัวเลือก ก ข ค ง ทีละข้อ</h4>
          <div>${optionsAnalysisHtml}</div>
        </div>

        <!-- 5.6 Trap Analysis -->
        <div class="explanation-section">
          <h4 style="color: var(--danger);">5. กับดักและจุดที่ผู้สอบมักผิดบ่อย</h4>
          <p style="background-color: var(--danger-subtle); padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-primary);">
            ${MathRenderer.formatMathString(Utils.escapeHtml(q.trap_analysis || ""))}
          </p>
        </div>

        <!-- 5.7 Exam Strategy -->
        <div class="explanation-section">
          <h4 style="color: var(--warning);">6. กลยุทธ์และสูตรลัดในห้องสอบจริง</h4>
          <p style="background-color: var(--warning-subtle); padding: 8px 12px; border-radius: var(--radius-sm); color: var(--text-primary);">
            ${MathRenderer.formatMathString(Utils.escapeHtml(q.exam_strategy || ""))}
          </p>
        </div>

        <!-- 5.8 Key Takeaways -->
        <div class="explanation-section">
          <h4>7. หัวใจสำคัญที่ต้องจำ</h4>
          <ul style="padding-left: 20px;">
            ${takeawaysHtml}
          </ul>
        </div>

        <!-- 5.9 Source References -->
        ${sourceHtml}
      </div>
    `;
  }
};

if (typeof window !== "undefined") {
  window.ExplanationRenderer = ExplanationRenderer;
}
