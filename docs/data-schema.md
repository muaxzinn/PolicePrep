# ข้อกำหนดมาตรฐานโครงสร้างข้อมูล (Data Schema Specification)
## Minimal Exam Preparation Platform — ตำรวจพิสูจน์หลักฐาน (ตร.พฐ.)

เอกสารนี้อธิบาย Schema ข้อมูลทั้งหมดในระบบ เพื่อให้ผู้พัฒนาและผู้ดูแลข้อมูลสามารถเข้าใจ โครงสร้างฟิลด์ ชนิดข้อมูล และตัวอย่างจริง

---

## 1. โครงสร้างเนื้อหาสรุปวิชาการ (Content Summary Schema)
ตำแหน่งไฟล์: `json/01_สรุปคณิตศาสตร์.json` ถึง `json/08_ข้อสอบ150ข้อ.json`

```typescript
interface ContentSummaryModule {
  subject_id: string;          // รหัสวิชา "01" ถึง "08"
  subject_name: string;        // ชื่อวิชาภาษาไทย
  total_pages: number;         // จำนวนหน้าทั้งหมด
  total_lines: number;         // จำนวนบรรทัดทั้งหมด
  source_files: string[];      // รายการไฟล์ PDF ต้นฉบับ เช่น ["pdfs/1st สรุปคณิตศาสตร์.pdf"]
  pages: ContentPage[];        // รายการหน้าทั้งหมด
}

interface ContentPage {
  page_number: number;         // เลขหน้า (1-indexed)
  content: string;             // เนื้อหาทั้งหมดในหน้านั้น (คั่นด้วย \n)
  lines: string[];             // บรรทัดที่แยกแล้ว สำหรับนำมาเรนเดอร์ใน Reader
}
```

---

## 2. โครงสร้างคลังข้อสอบวิเคราะห์ (Analytical Question Bank Schema)
ตำแหน่งไฟล์: `advanced_exams/01_exam_math.json` ถึง `advanced_exams/08_exam_comprehensive_150.json`

```typescript
interface ExamModule {
  module: string;              // "ADVANCED QUESTION DESIGN & DEEP EXPLANATION MODULE"
  subject_id: string;          // รหัสวิชา "01" ถึง "08"
  subject_name: string;        // ชื่อวิชา
  total_questions: number;     // 100 ข้อ
  standards: {
    patterns_used: string[];   // รูปแบบที่ใช้ เช่น ["รูปแบบ A: วิเคราะห์สถานการณ์", ...]
    verification_status_summary: {
      verified: number;        // จำนวนข้อที่ผ่านการตรวจสอบ
      needs_review: number;    // จำนวนข้อที่ต้องทบทวน (ต้องเป็น 0)
    };
  };
  questions: QuestionItem[];
}

interface QuestionItem {
  id: string;                  // รหัสประจำข้อ เช่น "Q_MATH_001"
  subject_id: string;          // รหัสวิชา "01" ถึง "08"
  subject_name: string;        // ชื่อวิชา
  topic: string;               // หัวข้อย่อยหรือสาระการเรียนรู้
  difficulty_level: number;    // ระดับความยาก 1 ถึง 5 (1=ง่ายมาก, 3=ปานกลาง, 5=วิเคราะห์ขั้นสูง)
  question_pattern: string;    // รูปแบบการคิดวิเคราะห์ (Patterns A–J)
  scenario?: string;           // บริบท/สถานการณ์สมมติ (ถ้ามี)
  question: string;            // ข้อความคำถาม
  options: QuestionOption[];   // ตัวเลือก 4 ข้อ (ก, ข, ค, ง)
  correct_answer: "ก" | "ข" | "ค" | "ง"; // ตัวเลือกที่ถูกต้อง
  source_type: "original" | "generated"; // แหล่งที่มา: "original" (ข้อสอบเดิม) หรือ "generated" (ข้อสอบขยาย)
  
  // โครงสร้างเฉลยละเอียด 9 หัวข้อ (Deep Explanation)
  concept_tested: string;      // 5.2 สรุปประเด็นที่โจทย์ต้องการวัด
  source_principle: string;    // 5.3 หลักการจากต้นฉบับ
  reasoning_steps: string[];   // 5.4 วิเคราะห์ข้อมูลในโจทย์ทีละขั้น (Step-by-Step)
  option_analysis: {           // 5.5 วิเคราะห์ตัวเลือก ก ข ค ง ทีละข้อ
    ก: string;
    ข: string;
    ค: string;
    ง: string;
  };
  trap_analysis: string;       // 5.6 วิเคราะห์กับดักของข้อสอบ
  exam_strategy: string;       // 5.7 วิธีคิดที่ควรใช้ในห้องสอบจริง
  key_takeaways: string[];     // 5.8 สรุปสิ่งที่ต้องจำ
  source_references: {         // 5.9 แหล่งอ้างอิง
    file: string;              // ไฟล์สรุปที่อ้างอิง เช่น "json/01_สรุปคณิตศาสตร์.json"
    page: number;              // หน้าที่พบในเอกสารสรุป
    citation: string;          // ข้อความอ้างอิง
  };
  verification_status: "verified";
  explanation: string;         // ข้อความ Markdown รวมทั้ง 9 ส่วน เพื่อความสะดวกในการเรนเดอร์
}

interface QuestionOption {
  label: "ก" | "ข" | "ค" | "ง";
  text: string;
}
```

---

## 3. โครงสร้างแค็ตตาล็อกกลางระบบ (Master Manifest Schema)
ตำแหน่งไฟล์: `data/manifest.json`

```typescript
interface MasterManifest {
  platform_name: string;
  version: string;
  content_modules: ContentModuleMeta[];
  exam_modules: ExamModuleMeta[];
  official_exams: OfficialExamLinkMeta[];
  pdf_documents: PDFDocumentMeta[];
}

interface ContentModuleMeta {
  id: string;                  // "01"
  title: string;               // "คณิตศาสตร์ (ความสามารถทั่วไป)"
  json_path: string;           // "json/01_สรุปคณิตศาสตร์.json"
  pages_count: number;         // 48
  linked_pdf: string;          // "pdfs/1st สรุปคณิตศาสตร์.pdf"
}

interface ExamModuleMeta {
  id: string;                  // "01"
  title: string;               // "คณิตศาสตร์ (ความสามารถทั่วไป)"
  json_path: string;           // "advanced_exams/01_exam_math.json"
  question_count: number;      // 100
  patterns: string[];
}

interface OfficialExamLinkMeta {
  subject: string;             // "วิชาคณิตศาสตร์"
  image_file: string;          // "QR Code วิชาคณิตศาสตร์.jpeg"
  qr_url: string;              // Shortlink
  destination_url: string;     // URL จริงปลายทาง
}

interface PDFDocumentMeta {
  filename: string;            // "1st สรุปคณิตศาสตร์.pdf"
  subject_id: string;          // "01"
  title: string;               // "คณิตศาสตร์"
  size_mb: number;             // 33.65
  file_path: string;           // "pdfs/1st สรุปคณิตศาสตร์.pdf"
}
```

---

## 4. โครงสร้างการจัดเก็บข้อมูลในเบราว์เซอร์ (Browser LocalStorage Schema)

- `examprep_settings`:
  ```json
  { "theme": "system" | "light" | "dark", "fontSize": "small" | "normal" | "large", "timerMinutes": 20 }
  ```
- `examprep_bookmarks`:
  ```json
  [ { "subjectId": "01", "subjectTitle": "คณิตศาสตร์", "pageNum": 3, "timestamp": 1729123456789 } ]
  ```
- `examprep_last_read`:
  ```json
  { "01": { "pageNum": 5, "timestamp": 1729123456789 } }
  ```
- `examprep_exam_history`:
  ```json
  [
    {
      "id": "attempt_1729123456789",
      "timestamp": 1729123456789,
      "subjectId": "01",
      "subjectName": "คณิตศาสตร์",
      "score": 85,
      "total": 100,
      "percentage": 85,
      "timeSpent": 980,
      "wrongCount": 15
    }
  ]
  ```
