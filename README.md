# ตร.พฐ. ExamPrep — Minimal Exam Preparation Platform
## ระบบเตรียมสอบนายสิบตำรวจ พิสูจน์หลักฐาน (ตร.พฐ.) แบบมินิมอล

แพลตฟอร์มเว็บแอปพลิเคชันสำหรับเตรียมสอบนายสิบตำรวจ กลุ่มสายงานพิสูจน์หลักฐาน (ตร.พฐ.) พัฒนาขึ้นด้วยสถาปัตยกรรม **Pure Static Web Architecture** (Semantic HTML5, Vanilla CSS Design System, Vanilla JavaScript ES6+, JSON และ PDF) โดยยึดหลักการออกแบบ 5 ประการ:
1. **Minimal** — แสดงเฉพาะสิ่งที่จำเป็น ไม่รกสายตา ปราศจากองค์ประกอบตกแต่งที่รบกวนสมาธิ
2. **Readability** — ควบคุมความยาวบรรทัด 60–80 ตัวอักษร สบายตา รองรับการอ่านระยะยาว และสูตรคณิตศาสตร์แสดงผลถูกต้อง
3. **Responsive** — Mobile-First แท้จริง ปรับเปลี่ยน Layout ตามพื้นที่จริง ไม่มี Horizontal Overflow
4. **Consistency** — Design Tokens ชุดเดียวกันทั้ง Light Mode, Dark Mode และ System Mode
5. **Reliability** — ข้อมูล 100% เชื่อมต่อจากไฟล์จริงใน Workspace ไม่ใช้ข้อมูล Mockup หรือสถิติปลอม

---

## 1. ข้อมูลจริงที่เชื่อมต่อในระบบ (Data Catalog)

ระบบเชื่อมต่อกับข้อมูลจริง 4 ส่วนหลักผ่าน `data/manifest.json`:

### 1.1 เนื้อหาสรุป 8 หมวดวิชา (706 หน้า จากการ OCR และคลีนนิ่ง)
- **หมวด 01:** คณิตศาสตร์ (ความสามารถทั่วไป) — 48 หน้า (`json/01_สรุปคณิตศาสตร์.json`)
- **หมวด 02:** ภาษาไทย — 50 หน้า (`json/02_สรุปภาษาไทย.json`)
- **หมวด 03:** ภาษาอังกฤษ — 87 หน้า (`json/03_สรุปภาษาอังกฤษ.json`)
- **หมวด 04:** คอมพิวเตอร์และเทคโนโลยีสารสนเทศ — 89 หน้า (`json/04_สรุปคอมพิวเตอร์.json`)
- **หมวด 05:** กฎหมายที่ประชาชนควรรู้ — 152 หน้า (`json/05_สรุปกฎหมาย.json`)
- **หมวด 06:** ระเบียบสำนักนายกรัฐมนตรี ว่าด้วยงานสารบรรณ — 201 หน้า (`json/06_สรุประเบียบงานสารบรรณ.json`)
- **หมวด 07:** ระเบียบสำนักงานตำรวจแห่งชาติ (ลักษณะที่ 54) — 36 หน้า (`json/07_สรุประเบียบตำรวจ_ลักษณะ54.json`)
- **หมวด 08:** ข้อสอบ 150 ข้อ (งานสารบรรณ + ลักษณะที่ 54) — 43 หน้า (`json/08_ข้อสอบ150ข้อ.json`)

> ทุกไฟล์ผ่านการตรวจสอบความสะอาด (Cleanliness Audit) ลายน้ำชื่อบุคคล เบอร์โทร และข้อความโฆษณาสแปมถูกตัดออกทั้งหมด 100%

### 1.2 คลังข้อสอบวิเคราะห์ขั้นสูง 800 ข้อ (100 ข้อต่อวิชา) พร้อมเฉลยละเอียด 9 มิติ (5.1 – 5.9)
ข้อสอบวิเคราะห์สถานการณ์ตามกรอบคิดเชิงวิเคราะห์ 10 รูปแบบ (Patterns A–J) ครบทั้ง 8 หมวดวิชา หมวดละ 100 ข้อ รวม **800 ข้อ** (`advanced_exams/*.json`):
- **หมวด 01 (คณิตศาสตร์):** 100 ข้อ (เดิม 6 ข้อ, สร้างเพิ่ม 94 ข้อ) — เฉลยละเอียด 9 มิติ
- **หมวด 02 (ภาษาไทย):** 100 ข้อ (เดิม 6 ข้อ, สร้างเพิ่ม 94 ข้อ) — เฉลยละเอียด 9 มิติ
- **หมวด 03 (ภาษาอังกฤษ):** 100 ข้อ (เดิม 6 ข้อ, สร้างเพิ่ม 94 ข้อ) — เฉลยละเอียด 9 มิติ
- **หมวด 04 (คอมพิวเตอร์):** 100 ข้อ (เดิม 6 ข้อ, สร้างเพิ่ม 94 ข้อ) — เฉลยละเอียด 9 มิติ
- **หมวด 05 (กฎหมาย):** 100 ข้อ (เดิม 6 ข้อ, สร้างเพิ่ม 94 ข้อ) — เฉลยละเอียด 9 มิติ
- **หมวด 06 (งานสารบรรณ):** 100 ข้อ (เดิม 6 ข้อ, สร้างเพิ่ม 94 ข้อ) — เฉลยละเอียด 9 มิติ
- **หมวด 07 (ระเบียบ ตร. ลักษณะ 54):** 100 ข้อ (เดิม 6 ข้อ, สร้างเพิ่ม 94 ข้อ) — เฉลยละเอียด 9 มิติ
- **หมวด 08 (บูรณาการ 150 ข้อ):** 100 ข้อ (เดิม 6 ข้อ, สร้างเพิ่ม 94 ข้อ) — เฉลยละเอียด 9 มิติ

**โครงสร้างเฉลยละเอียด 9 มิติ (Sections 5.1 – 5.9):**
- **5.1** คำตอบที่ถูกต้อง
- **5.2** สรุปประเด็นที่โจทย์ต้องการวัด (Core Concept)
- **5.3** หลักการจากต้นฉบับ (Source Principle)
- **5.4** วิเคราะห์ข้อมูลในโจทย์ทีละขั้น (Step-by-Step Reasoning)
- **5.5** วิเคราะห์ตัวเลือก ก ข ค ง ทีละข้อ (Comprehensive Choice Analysis)
- **5.6** วิเคราะห์กับดักของข้อสอบ (Trap Analysis)
- **5.7** วิธีคิดที่ควรใช้ในการสอบจริง (Exam Strategy)
- **5.8** สรุปสิ่งที่ต้องจำ (Key Takeaways)
- **5.9** แหล่งอ้างอิงและหน้าที่พบ (Citation Reference)

### 1.3 เอกสารต้นฉบับ PDF รวม 10 เล่ม จัดกลุ่มอยู่ในโฟลเดอร์ `pdfs/` (ขนาดรวม ~525 MB)
- `pdfs/1st สรุปคณิตศาสตร์.pdf` (33.7 MB)
- `pdfs/2nd สรุปภาษาไทย.pdf` (38.7 MB)
- `pdfs/3rd สรุปภาษาอังกฤษ.pdf` (82.8 MB)
- `pdfs/4th สรุปคอมพิวเตอร์.pdf` (94.0 MB)
- `pdfs/5th สรุปกฎหมาย (Part 1).pdf` (63.1 MB)
- `pdfs/5th สรุปกฎหมาย (Part 2).pdf` (64.6 MB)
- `pdfs/6th สรุประเบียบงานสารบรรณ (Part 1).pdf` (50.9 MB)
- `pdfs/6th สรุประเบียบงานสารบรรณ (Part 2).pdf` (33.7 MB)
- `pdfs/7th สรุประเบียบตำรวจ (ลักษณะที่ 54).pdf` (40.5 MB)
- `pdfs/ข้อสอบ 150 ข้อ (งานสารบรรณ + ลักษณะที่ 54).pdf` (23.5 MB)

### 1.4 พอร์ทัลข้อสอบทางการจากการสแกน QR Code (6 วิชา)
สแกนด้วย Native Vision `CIDetector` และถอดรหัส URL ปลายทาง:
1. **คณิตศาสตร์:** `https://guru-summarize-math.pages.dev/`
2. **ภาษาไทย:** `https://guru-buzzspeed-thai.pages.dev/`
3. **ภาษาอังกฤษ:** `https://guru-buzzspeed-eng.pages.dev/`
4. **คอมพิวเตอร์:** `https://guru-buzzspeed-computer.pages.dev/`
5. **กฎหมาย:** `https://guru-buzzspeed-law.pages.dev/`
6. **งานสารบรรณ + ลักษณะที่ 54:** `https://guru-buzzspeed-sarabun.pages.dev/`

---

## 2. เอกสารอ้างอิงระบบ (Documentation Index)

โปรเจกต์มีเอกสารอธิบายสถาปัตยกรรมและการดำเนินงานอย่างละเอียดในโฟลเดอร์ `docs/`:
- **`docs/project-audit.md`** — รายงานผลการตรวจสอบไฟล์จริง โครงสร้างข้อมูล ปัญหาที่พบ และแนวทางป้องกัน
- **`docs/data-schema.md`** — ข้อกำหนดมาตรฐาน Schema ข้อมูล JSON ทุกประเภทในระบบ
- **`docs/question-bank-progress.md`** — รายงานสถิติคลังข้อสอบ 800 ข้อ การกระจายตัวเลือก และสัดส่วนความยาก

---

## 3. คู่มือสำหรับนักพัฒนา: การเพิ่มและปรับปรุงข้อมูล (Developer Guide)

### 3.1 วิธีการเพิ่มเนื้อหาสรุปวิชาใหม่
1. นำไฟล์สรุปในรูปแบบ JSON (จัดโครงสร้างแบบ `pages: [{ page_number, content, lines }]`) ไปวางไว้ในโฟลเดอร์ `json/`
2. เพิ่มรายการใน `data/manifest.json` ภายใต้คีย์ `"content_modules"`:
   ```json
   {
     "id": "09",
     "title": "ชื่อวิชาใหม่",
     "json_path": "json/09_สรุปวิชาใหม่.json",
     "pages_count": 50,
     "linked_pdf": "pdfs/9th สรุปวิชาใหม่.pdf"
   }
   ```
3. รัน `python3 tests/test_platform.py` เพื่อตรวจสอบความถูกต้อง

### 3.2 วิธีการเพิ่มข้อสอบในคลังข้อสอบ
1. เปิดไฟล์ `advanced_exams/{subject_id}_exam_{subject}.json`
2. เพิ่มวัตถุข้อสอบในอาร์เรย์ `"questions"` ตาม Schema 21 ฟิลด์ (ดู `docs/data-schema.md`):
   - ระบุ `"source_type": "generated"` สำหรับข้อสอบใหม่ หรือ `"original"` สำหรับข้อสอบจริงเดิม
   - ตรวจสอบให้มีตัวเลือก 4 ตัวเลือก (ก, ข, ค, ง)
   - ใส่เฉลยละเอียดที่มีหัวข้อ `5.1` ถึง `5.9`
3. อัปเดตฟิลด์ `"question_count"` ใน `advanced_exams/master_exam_catalog.json` และ `data/manifest.json`
4. รัน `python3 tests/test_platform.py`

### 3.3 วิธีการเพิ่มเอกสาร PDF
1. นำไฟล์ PDF ไปวางไว้ในโฟลเดอร์ `pdfs/`
2. อัปเดตรายการใน `data/manifest.json` ภายใต้ `"pdf_documents"`
3. เชื่อมโยงกับโมดูลเนื้อหาใน `"content_modules"` ผ่านฟิลด์ `"linked_pdf"`

### 3.4 วิธีการเพิ่มหรือแก้ไขลิงก์ข้อสอบทางการ
1. อัปเดตไฟล์ `qr_code_links.json` และ `data/manifest.json` ในส่วน `"official_exams"`
2. ระบุชื่อวิชา, URL ของ QR Code และ URL ปลายทาง HTTPS

---

## 4. การแสดงผลสูตรคณิตศาสตร์ (Math Precision Engine)

1. **KaTeX Auto-Render Engine:** เรนเดอร์สูตร LaTeX คุณภาพสูง ทั้ง Inline `$ ... $` / `\( ... \)` และ Display `$$ ... $$` / `\[ ... \]`
2. **Dynamic Fallback Parser:** หาก KaTeX ไม่พร้อมใช้งาน ระบบมี Fallback สำหรับยกกำลัง (`x²`, `13²`), ราก (`√x`), เศษส่วน (`a/b`), เครื่องหมายเปรียบเทียบ (`≤, ≥, ±, ×, ÷`), และเซต (`∩, ∪, ∈`)
3. **Horizontal Safe Overflow:** กำหนด `.math-block { overflow-x: auto; max-width: 100%; }` ทำให้สูตรสมการยาวสามารถเลื่อนดูในแนวนอนได้โดยไม่ดันหน้าจอมือถือให้เสียสัดส่วน

---

## 5. สถาปัตยกรรมไฟล์ (Project Architecture)

```
├── index.html                 # Main Single-Page Application Shell
├── content.html               # Direct Entry & Redirector to #content
├── pdf-reader.html            # Direct Entry & Redirector to #pdf
├── exam.html                  # Direct Entry & Redirector to #exam
├── official.html              # Direct Entry & Redirector to #official
├── history.html               # Direct Entry & Redirector to #history
├── settings.html              # Direct Entry & Redirector to #settings
├── css/
│   ├── tokens.css             # Design Tokens (Light, Dark, System, Spacing, Typography)
│   ├── base.css               # Reset, Font Stacks, Focus Rings, Accessible Scrollbars
│   ├── layout.css             # Header, Navigation, Mobile Bottom Nav, App Shell
│   ├── components.css         # Buttons, Cards, Inputs, Badges, Modals, Toasts
│   ├── pages.css              # Dashboard, Reader, Exam Simulator, PDF Viewer Styles
│   └── responsive.css         # Breakpoints (<480px, <768px, 768-1024px, >1024px, Print)
├── js/
│   ├── icons.js               # Clean Stroke-based SVG Icons Library (No Emojis)
│   ├── utils.js               # XSS Escape, LocalStorage wrapper, Date/Time Formatters, Toast
│   ├── math-renderer.js       # KaTeX integration & regex mathematical fallback parser
│   ├── progress-store.js      # LocalStorage manager for theme, font scale, history & bookmarks
│   ├── data-loader.js         # Async JSON fetcher with caching and schema normalizers
│   ├── explanation-renderer.js# Deep 9-Section interactive explanation card formatter
│   ├── content-renderer.js    # Subject summary reader, pagination & in-page text highlighter
│   ├── pdf-viewer.js          # In-app PDF viewport with document switcher & downloads
│   ├── exam-engine.js         # Realistic exam simulator, timer, question palette & grading
│   ├── official-links.js      # Official QR Portal directory renderer
│   ├── ui.js                  # Theme toggler (Light/Dark/System), font scaler, history manager
│   ├── router.js              # Hash-based SPA Router (#dashboard, #content, #exam, etc.)
│   └── app.js                 # Application lifecycle orchestrator
├── data/
│   └── manifest.json          # Unified catalog indexing all modules, exams, PDFs, and links
├── pdfs/                      # โฟลเดอร์รวมเอกสารสรุป PDF ทั้ง 10 เล่ม (~525 MB)
├── advanced_exams/            # 8 Verified analytical exam bank JSONs (100 questions each, total 800)
├── generators/                # Python generators for automated question expansion & verification
├── json/                      # 8 OCR Subject summary JSONs (706 pages)
├── docs/
│   ├── project-audit.md       # Audit report & risk analysis
│   ├── data-schema.md         # Data schema standards & field descriptions
│   └── question-bank-progress.md # Progress and metrics for 800 questions
├── tests/
│   └── test_platform.py       # Automated verification test suite
└── README.md                  # Project documentation & operational guide
```

---

## 6. วิธีการเปิดใช้งาน (Getting Started)

### 6.1 เปิดใช้งานในเครื่อง (Local Run)
เนื่องจากเป็นเว็บแอปพลิเคชัน Static Web มาตรฐาน สามารถเปิดใช้งานได้ผ่าน Local Web Server ใด ๆ:

```bash
# วิธีที่ 1: รันด้วย Python 3
python3 -m http.server 8080

# วิธีที่ 2: รันด้วย Node.js npx
npx serve .

# วิธีที่ 3: เปิดผ่าน VS Code / IDE Live Server Extension
```
จากนั้นเปิดเบราว์เซอร์ไปที่: `http://localhost:8080`

### 6.2 การ Deploy บน GitHub Pages
1. Push โค้ดทั้งหมดขึ้น GitHub Repository
2. ไปที่ **Settings** > **Pages**
3. เลือก Source เป็น `Deploy from a branch` (Branch: `main` / `master`, Folder: `/ (root)`)
4. บันทึกและรอ GitHub Pages ประมวลผล
5. เว็บไซต์รองรับ **Relative Paths** 100% จึงทำงานได้อย่างสมบูรณ์แบบบน Project Sites (เช่น `https://username.github.io/reponame/`)

---

## 7. การทดสอบและการตรวจสอบคุณภาพ (Testing & Verification)

โครงการมีชุดทดสอบอัตโนมัติ `tests/test_platform.py` ที่ตรวจสอบ 5 หมวด:
1. **Manifest & File Integrity:** ตรวจสอบความมีอยู่จริงของไฟล์ JSON ทั้ง 16 ไฟล์, PDF ทั้ง 10 เล่ม และลิงก์ทางการ
2. **Mathematical Notation & Delimiters:** ตรวจสอบความสมดุลของวงเล็บและสัญลักษณ์คณิตศาสตร์
3. **Deep 9-Section Explanations:** ตรวจสอบว่าคำถามทั้ง **800 ข้อ** มีเนื้อหาเฉลยครบทั้ง 9 หัวข้อ (5.1 - 5.9)
4. **Cleanliness & Watermark Audit:** ตรวจสอบทั้ง 706 หน้า ว่าปลอดจากลายน้ำชื่อบุคคลและข้อความสแปม 100%
5. **Official Links Validation:** ตรวจสอบความถูกต้องของลิงก์ปลายทาง HTTPS ทั้ง 6 วิชา

รันการทดสอบด้วยคำสั่ง:
```bash
python3 tests/test_platform.py
```
**ผลการทดสอบ:** `🎉 ALL 5 TEST SUITES PASSED FLAWLESSLY!`

---

## 8. ข้อจำกัดของระบบ (System Constraints & Disclaimers)

1. **Client-side Answer Visibility:** เนื่องจากเป็น Static Web Application ที่เก็บข้อสอบไว้ใน JSON ในเครื่อง ผู้ใช้ที่มีความรู้ทางเทคนิคสามารถดูเฉลยผ่านการเปิดดูไฟล์ JSON ได้โดยตรง ซึ่งเป็นข้อจำกัดปกติของ Static Sites
2. **Local Storage Scoping:** ข้อมูล Bookmark, ขนาดตัวอักษร, ธีม และประวัติคะแนนสอบจะถูกบันทึกไว้ใน Browser LocalStorage ของอุปกรณ์นั้น ๆ ไม่มีการซิงก์ข้ามเครื่องโดยอัตโนมัติ
3. **PDF Rendering on Mobile Browsers:** ในสมาร์ทโฟนบางรุ่น เบราว์เซอร์อาจไม่รองรับการแสดง `iframe` PDF แบบโต้ตอบได้เต็มประสิทธิภาพ ระบบจึงมีปุ่ม **"เปิดแท็บใหม่"** และ **"ดาวน์โหลด"** ให้ผู้ใช้เลือกเปิดผ่าน Native PDF Viewer ของเครื่องได้เสมอ
