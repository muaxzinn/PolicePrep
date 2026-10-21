/**
 * DataLoader Module
 * Loads and caches Manifest, Content summaries, Exam banks, and Official links
 */
const DataLoader = {
  manifest: null,
  cache: new Map(),

  /**
   * Load master manifest
   */
  async loadManifest() {
    if (this.manifest) return this.manifest;
    try {
      const resp = await fetch("data/manifest.json");
      if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
      this.manifest = await resp.json();
      return this.manifest;
    } catch (err) {
      console.error("Failed to load manifest.json:", err);
      // Fallback minimal manifest
      return {
        content_modules: [],
        exam_modules: [],
        official_exams: [],
        pdf_documents: []
      };
    }
  },

  /**
   * Load subject summary content
   */
  async loadContentSubject(subjectId) {
    const manifest = await this.loadManifest();
    const mod = manifest.content_modules.find(m => m.id === subjectId);
    if (!mod) throw new Error(`Subject module ${subjectId} not found in manifest`);

    const cacheKey = `content_${subjectId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const resp = await fetch(mod.json_path);
    if (!resp.ok) throw new Error(`Failed to load ${mod.json_path}: HTTP ${resp.status}`);
    const data = await resp.json();
    
    // Normalize structure
    const normalized = {
      id: subjectId,
      title: mod.title,
      linked_pdf: mod.linked_pdf,
      ebook_title: data.ebook_title || data.subject_name || mod.title,
      subtitle: data.subtitle || "",
      total_chapters: data.total_chapters || (data.chapters ? data.chapters.length : 1),
      total_pages: data.total_pages || (data.pages ? data.pages.length : 0),
      table_of_contents: data.table_of_contents || [],
      chapters: data.chapters || [],
      pages: (data.pages || []).map((p, idx) => ({
        page_number: p.page_number || (idx + 1),
        title: p.title || `หน้า ${idx + 1}`,
        chapter_num: p.chapter_num || 1,
        chapter_title: p.chapter_title || "",
        reading_time_min: p.reading_time_min || 2,
        callouts: p.callouts || [],
        key_takeaways: p.key_takeaways || [],
        content: p.content || "",
        lines: p.lines || (p.content ? p.content.split("\n") : [])
      }))
    };

    this.cache.set(cacheKey, normalized);
    return normalized;
  },

  /**
   * Load subject exam questions
   */
  async loadExamSubject(subjectId) {
    const manifest = await this.loadManifest();
    const mod = manifest.exam_modules.find(m => m.id === subjectId);
    if (!mod) throw new Error(`Exam module ${subjectId} not found in manifest`);

    const cacheKey = `exam_${subjectId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const resp = await fetch(mod.json_path);
    if (!resp.ok) throw new Error(`Failed to load ${mod.json_path}: HTTP ${resp.status}`);
    const data = await resp.json();

    const normalized = {
      subject_id: subjectId,
      subject_name: data.subject_name || mod.title,
      total_questions: data.total_questions || (data.questions ? data.questions.length : 0),
      standards: data.standards || {},
      questions: data.questions || []
    };

    this.cache.set(cacheKey, normalized);
    return normalized;
  },

  /**
   * Load all 8 exam subject questions simultaneously
   */
  async loadAllExamSubjects() {
    const manifest = await this.loadManifest();
    const modules = manifest.exam_modules || [];
    const results = await Promise.all(modules.map(m => this.loadExamSubject(m.id)));
    return results;
  },

  /**
   * Load all official exam links
   */
  async loadOfficialExams() {
    const manifest = await this.loadManifest();
    return manifest.official_exams || [];
  },

  /**
   * Load list of PDF documents
   */
  async loadPDFList() {
    const manifest = await this.loadManifest();
    return manifest.pdf_documents || [];
  },

  /**
   * Load Oxford 3000 Metadata
   */
  async loadOxfordMeta() {
    const cacheKey = "oxford_meta";
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    try {
      const resp = await fetch("data/oxford_meta.json");
      if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
      const data = await resp.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (err) {
      console.error("Failed to load oxford_meta.json:", err);
      return null;
    }
  },

  /**
   * Load Oxford words by CEFR Level ("A1" | "A2" | "B1" | "B2" | "ALL")
   */
  async loadOxfordLevel(level = "A1") {
    const lvl = (level || "A1").toUpperCase();
    if (lvl === "ALL") {
      const levels = ["A1", "A2", "B1", "B2"];
      const results = await Promise.all(levels.map(l => this.loadOxfordLevel(l)));
      return results.flat();
    }

    const cacheKey = `oxford_${lvl.toLowerCase()}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const fpath = `data/oxford_${lvl.toLowerCase()}.json`;
    const resp = await fetch(fpath);
    if (!resp.ok) throw new Error(`Failed to load ${fpath}: HTTP ${resp.status}`);
    const data = await resp.json();
    this.cache.set(cacheKey, data);
    return data;
  }
};

if (typeof window !== "undefined") {
  window.DataLoader = DataLoader;
}
