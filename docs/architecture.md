# Architecture & Design System Specification
## Minimal Exam Preparation Platform (ตร.พฐ.)

### 1. Overview & Core Philosophy
The platform is an ultra-minimalist, distraction-free study and exam simulation application tailored for candidates preparing for the Police Forensic Science Division (ตร.พฐ.) examination. It adheres strictly to five core tenets:
1. **Minimal**: Clean visual planes, zero decorative fluff, no intrusive popups or loud gradients.
2. **Readability**: Optimized line lengths (60–80 characters for Thai text), clear hierarchical typography, and native-feeling mathematical typography.
3. **Responsive**: Fluid mobile-first layout transitioning smoothly across mobile, tablet, laptop, and desktop viewports.
4. **Consistency**: Unified design system across all 6 main views.
5. **Reliability**: 100% powered by real workspace data (706 pages of summary content, 48 analytical exam questions, 10 official PDFs, and 6 verified official test portals).

---

### 2. Information Architecture & Routing
The platform operates as a fast, accessible multi-page or client-routed Single Page Experience without requiring heavy bundlers or Node.js runtime.

- **Dashboard (`/` or `index.html`)**:
  - Daily quick access, study overview, jump to last read chapter or pending exam.
  - Minimal search bar across subjects.
- **Content Library (`content.html`)**:
  - Clean text reader displaying extracted academic OCR text from `json/01_...` to `json/08_...`.
  - Chapter and page selector, full-text search within subject, bookmarking, and math equation rendering.
- **PDF Reader (`pdf-reader.html`)**:
  - Dedicated viewer for the 10 original PDFs (located in `pdfs/`) with page navigation, zoom, download, and external viewer options.
- **Exam Center (`exam.html`)**:
  - Realistic exam simulator loading questions from `advanced_exams/`.
  - Options for timed/untimed, flag for review, instant validation or submit-and-score mode, and deep 9-section explanation cards.
- **Official Exams (`official.html`)**:
  - Direct directory of the 6 official mock test portals scanned from verified QR codes (`qr_code_links.json`).
- **History & Settings (`history.html` / `settings.html`)**:
  - Local persistence of past exam scores, question review list, theme switching (Light / Dark / System), and font scaling.

---

### 3. Design System Tokens
- **Font Stack**:
  - Primary Thai: `'Noto Sans Thai'`, `'Sarabun'`, system-ui, -apple-system, sans-serif.
  - Monospace / Math: `'JetBrains Mono'`, `'SF Mono'`, Consolas, monospace.
- **Color Palettes**:
  - **Light Mode**:
    - Surface Base: `#FBFBFD`
    - Card / Pane: `#FFFFFF`
    - Text Primary: `#1D1D1F`
    - Text Secondary: `#6E6E73`
    - Border / Divider: `#E5E5EA`
    - Accent: `#0066CC` (Deep Navy / Police Blue tone)
    - Success: `#28873E`, Warning: `#C96E00`, Error: `#D73A49`
  - **Dark Mode**:
    - Surface Base: `#121214`
    - Card / Pane: `#1C1C1E`
    - Text Primary: `#F5F5F7`
    - Text Secondary: `#86868B`
    - Border / Divider: `#2C2C2E`
    - Accent: `#2997FF`
    - Success: `#30D158`, Warning: `#FF9F0A`, Error: `#FF453A`

---

### 4. Mathematical Equation Engine
- Leverages **KaTeX** for instant, lightweight client-side rendering of LaTeX math notations (`\( ... \)` and `\[ ... \]`).
- Graceful fallback: If CDN fails or offline, custom lightweight regex formats exponents (`x^2` -> `x²`), fractions, and symbols (`±, ×, ÷, ≤, ≥, ≠, ∈, ∩, ∪`) cleanly without breaking content flow.

---

### 5. Mobile-First Navigation
- **Mobile (< 768px)**:
  - Top Bar: App title + Search icon + Theme toggle.
  - Bottom Bar: Minimal 5-item navigation (หน้าหลัก, เนื้อหา, PDF, ข้อสอบ, อื่นๆ).
- **Tablet / Desktop (>= 768px)**:
  - Sleek top navigation bar with clean text links and active indicator.
