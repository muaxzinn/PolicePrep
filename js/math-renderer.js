/**
 * MathRenderer Module
 * Handles mathematical equations using KaTeX with robust fallback rendering
 */
const MathRenderer = {
  isKaTeXAvailable() {
    return typeof window.katex !== "undefined";
  },

  /**
   * Render math equations inside a DOM container
   */
  renderElement(element) {
    if (!element) return;

    if (this.isKaTeXAvailable()) {
      try {
        if (typeof window.renderMathInElement === "function") {
          window.renderMathInElement(element, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "\\[", right: "\\]", display: true },
              { left: "\\(", right: "\\)", display: false },
              { left: "$", right: "$", display: false }
            ],
            throwOnError: false,
            errorColor: "#DC3545"
          });
          return;
        }
      } catch (err) {
        console.warn("KaTeX render failed, applying robust fallback:", err);
      }
    }

    // Fallback: Clean Regex Replacer for common math patterns
    this.fallbackRender(element);
  },

  /**
   * Format a text string with math expressions
   */
  formatMathString(text) {
    if (!text || typeof text !== "string") return "";

    // 1. Process LaTeX display math: \[ ... \] or $$ ... $$
    text = text.replace(/(\\\[|\\$\\$)([\s\S]*?)(\\\]|\\$\\$)/g, (match, open, formula) => {
      if (this.isKaTeXAvailable()) {
        try {
          return `<div class="math-block">${window.katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })}</div>`;
        } catch (e) {}
      }
      return `<div class="math-block"><code>${Utils.escapeHtml(formula.trim())}</code></div>`;
    });

    // 2. Process LaTeX inline math: \( ... \) or $ ... $
    text = text.replace(/(\\\(|\$)([\s\S]*?)(\\\)|\$)/g, (match, open, formula) => {
      if (this.isKaTeXAvailable()) {
        try {
          return `<span class="math-inline">${window.katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })}</span>`;
        } catch (e) {}
      }
      return `<span class="math-inline"><code>${Utils.escapeHtml(formula.trim())}</code></span>`;
    });

    // 3. Fallback for superscripts and common symbols
    text = text
      .replace(/\^2/g, "²")
      .replace(/\^3/g, "³")
      .replace(/\^n/g, "ⁿ")
      .replace(/<=/g, "≤")
      .replace(/>=/g, "≥")
      .replace(/!=/g, "≠")
      .replace(/\+-/g, "±");

    // 4. Transform raw emojis (check/cross) into crisp modern SVG graphics
    text = text
      .replace(/[❌✖]/gu, '<span class="text-danger inline-symbol" style="display:inline-flex; align-items:center; vertical-align:middle; margin:0 2px;">' + (typeof Icons !== "undefined" && Icons.close ? Icons.close() : "✗") + '</span>')
      .replace(/[✔✔️]/gu, '<span class="text-success inline-symbol" style="display:inline-flex; align-items:center; vertical-align:middle; margin:0 2px;">' + (typeof Icons !== "undefined" && Icons.check ? Icons.check() : "✓") + '</span>');

    return text;
  },

  /**
   * Fallback DOM text replacer
   */
  fallbackRender(container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      if (node.nodeValue && (/[\$\^\\_\±\≤\≥]/.test(node.nodeValue))) {
        const span = document.createElement("span");
        span.innerHTML = this.formatMathString(node.nodeValue);
        if (span.innerHTML !== node.nodeValue && node.parentNode) {
          node.parentNode.replaceChild(span, node);
        }
      }
    }
  }
};

if (typeof window !== "undefined") {
  window.MathRenderer = MathRenderer;
}
