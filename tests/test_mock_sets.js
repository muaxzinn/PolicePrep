/**
 * Automated Test Suite for 150-Question 6-Subject Official Mock Exam Sets
 * Features tested:
 * 1. 6 Subject Quotas (Math: 20, Thai: 20, IT: 40, Saraban: 30, Law: 25, English: 15 = 150 Qs)
 * 2. Automatic Capacity Calculation (identifies bottleneck subject and max unique sets = 7)
 * 3. Dual-Section Passing Criteria (Section A >= 24/40, Section B >= 66/110, Total >= 90/150)
 * 4. Difficulty balance (easy/hard) across all 6 subjects
 * 5. Deduplication across initial sets
 * 6. Set taking, instant subject jump, answering, and retake mechanism
 * 7. Zero emojis compliance
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Mock Browser Environment
global.window = global;
global.window.scrollTo = () => {};
global.confirm = () => true;
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// 2. Load manifest and exam JSONs directly
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/manifest.json'), 'utf8'));

global.DataLoader = {
  manifest,
  cache: new Map(),
  async loadManifest() { return manifest; },
  async loadExamSubject(subId) {
    const mod = manifest.exam_modules.find(m => m.id === subId);
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, mod.json_path), 'utf8'));
    return {
      subject_id: subId,
      subject_name: raw.subject_name || mod.title,
      total_questions: raw.questions.length,
      questions: raw.questions
    };
  },
  async loadAllExamSubjects() {
    return Promise.all(manifest.exam_modules.map(m => this.loadExamSubject(m.id)));
  }
};

// 3. Load Application Modules
require(path.join(ROOT_DIR, 'js/icons.js'));
require(path.join(ROOT_DIR, 'js/utils.js'));
require(path.join(ROOT_DIR, 'js/math-renderer.js'));
require(path.join(ROOT_DIR, 'js/explanation-renderer.js'));
require(path.join(ROOT_DIR, 'js/progress-store.js'));
require(path.join(ROOT_DIR, 'js/exam-engine.js'));

async function runTestSuite() {
  console.log("=== Testing 150-Question 6-Subject Official Mock Exam Sets ===\n");

  // Test 1: Subject Specifications & Sections Metadata
  console.log("Test 1: Verifying 6 Subject Specifications & 2 Sections");
  assert(ExamEngine.MOCK_SUBJECT_SPECS.length === 6, "Must have exactly 6 mock subject specifications");
  
  const expectedQuotas = {
    math: 20,
    thai: 20,
    computer: 40,
    saraban: 30,
    law: 25,
    english: 15
  };
  let totalQuota = 0;
  ExamEngine.MOCK_SUBJECT_SPECS.forEach(spec => {
    assert(expectedQuotas[spec.key] === spec.quota, `Subject ${spec.key} expected quota ${expectedQuotas[spec.key]}, got ${spec.quota}`);
    totalQuota += spec.quota;
  });
  assert(totalQuota === 150, `Total quota must equal 150, got ${totalQuota}`);

  // Check Section Definitions
  assert(ExamEngine.MOCK_SECTIONS.A.totalQuestions === 40, "Section A totalQuestions must be 40");
  assert(ExamEngine.MOCK_SECTIONS.A.minPassScore === 24, "Section A minPassScore must be 24 (60%)");
  assert(ExamEngine.MOCK_SECTIONS.B.totalQuestions === 110, "Section B totalQuestions must be 110");
  assert(ExamEngine.MOCK_SECTIONS.B.minPassScore === 66, "Section B minPassScore must be 66 (60%)");
  console.log("  ✓ 6 Subjects metadata & 2 Sections (Section A: 40, Section B: 110) correctly configured.\n");

  // Test 2: Preloading All Database Questions
  console.log("Test 2: Preloading Database Questions");
  const allSubs = await ExamEngine.ensureAllExamSubjectsLoaded();
  assert(allSubs.length === 8, "Expected 8 loaded modules from raw data");
  let totalQuestionsCount = 0;
  allSubs.forEach(sub => {
    totalQuestionsCount += (sub.questions || []).length;
  });
  assert(totalQuestionsCount === 2400, `Expected 2400 raw questions, got ${totalQuestionsCount}`);
  console.log(`  ✓ Successfully indexed all ${totalQuestionsCount} questions in the system.\n`);

  // Test 3: Automatic Capacity Calculation
  console.log("Test 3: Testing Automatic Capacity Calculation (Dynamic Sets Available)");
  const capacity = ExamEngine.calculateCapacity(allSubs);
  assert(typeof capacity.maxUniqueSets === "number", "maxUniqueSets must be a number");
  // Computer has 300 questions / 40 quota = 7 sets max without repetition
  assert(capacity.maxUniqueSets === 7, `Expected maxUniqueSets to be 7 (limited by IT 300/40), got ${capacity.maxUniqueSets}`);
  assert(capacity.bottlenecks.length > 0, "Expected at least 1 bottleneck identified");
  assert(capacity.bottlenecks[0].key === "computer", `Bottleneck subject must be computer, got ${capacity.bottlenecks[0].key}`);
  
  const capMap = {};
  capacity.subjectCaps.forEach(c => { capMap[c.key] = c; });
  assert(capMap.computer.maxSets === 7, "Computer max sets must be 7");
  assert(capMap.saraban.maxSets === 30, "Saraban (900 questions / 30) max sets must be 30");
  assert(capMap.law.maxSets === 12, "Law (300 questions / 25) max sets must be 12");
  assert(capMap.english.maxSets === 20, "English (300 questions / 15) max sets must be 20");
  console.log(`  ✓ Dynamic Capacity calculated: Max unique sets = ${capacity.maxUniqueSets} (Bottleneck: ${capacity.bottlenecks[0].name} with ${capacity.bottlenecks[0].totalAvailable} questions).\n`);

  // Test 4: Generate 5 Initial Mock Sets of 150 Questions
  console.log("Test 4: Generating 5 Initial Mock Sets (150 Questions Each)");
  const mockData = ExamEngine.getMockSetsData();
  assert(mockData.sets.length === 5, "Expected 5 initial sets generated");

  mockData.sets.forEach((set, sIdx) => {
    assert(set.totalQuestions === 150, `Set ${sIdx + 1} must have 150 questions, got ${set.totalQuestions}`);
    assert(set.timeLimitMinutes === 180, `Set ${sIdx + 1} must have 180 minutes limit`);
    assert(set.hasStarted === false, `Set ${sIdx + 1} must be unstarted initially`);
    assert(set.isCompleted === false, `Set ${sIdx + 1} must be uncompleted initially`);
    assert(set.questionIds.length === 150, `Set ${sIdx + 1} questionIds length must be 150`);

    // Verify each subject slice and difficulty split
    let offset = 0;
    ExamEngine.MOCK_SUBJECT_SPECS.forEach(spec => {
      const slice = set.questionIds.slice(offset, offset + spec.quota);
      assert(slice.length === spec.quota, `Set ${sIdx + 1} subject ${spec.key} must have ${spec.quota} questions, got ${slice.length}`);
      
      const questions = slice.map(id => ExamEngine.questionMap.get(id));
      assert(questions.every(Boolean), `All questions in slice ${spec.key} must exist in questionMap`);

      const easyCount = questions.filter(q => (q.difficulty_level || 3) <= 3).length;
      const hardCount = questions.filter(q => (q.difficulty_level || 3) >= 4).length;

      // Allow slight variance if odd or dataset skewed, but verify it attempts balance
      assert(easyCount + hardCount === spec.quota, `Easy + hard must equal quota ${spec.quota}`);
      assert(easyCount >= Math.floor(spec.easyCount * 0.7), `Subject ${spec.key} should have balanced easy questions`);
      assert(hardCount >= Math.floor(spec.hardCount * 0.7), `Subject ${spec.key} should have balanced hard questions`);

      offset += spec.quota;
    });

    console.log(`  ✓ Set ${set.setNumber} (${set.title}): 150 questions verified across all 6 subjects.`);
  });
  console.log("");

  // Test 5: Deduplication Across Initial Sets
  console.log("Test 5: Testing Deduplication Across Initial Sets 1-5");
  const idCounts = new Map();
  mockData.sets.forEach(s => {
    s.questionIds.forEach(id => {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    });
  });
  const duplicateIds = Array.from(idCounts.entries()).filter(([id, count]) => count > 1);
  assert(duplicateIds.length === 0, `Expected 0 duplicate questions across initial 5 sets, found ${duplicateIds.length}`);
  console.log(`  ✓ Zero duplicate questions across 5 mock sets (${mockData.sets.length * 150} unique questions).\n`);

  // Test 6: In-Set Test Taking & Subject Jump Navigation
  console.log("Test 6: Simulating 150-Question Test-Taking & Subject Chips Navigation");
  const container = { innerHTML: "" };
  ExamEngine.container = container;
  const set1 = mockData.sets[0];
  await ExamEngine.openSet(set1.id);

  assert(ExamEngine.activeSetId === set1.id, "activeSetId should match set1.id");
  assert(ExamEngine.questions.length === 150, "Active set must have 150 questions loaded");
  assert(ExamEngine.timerInterval !== null, "Timer must be active during exam");

  // Select answers for math question 1
  const q0 = ExamEngine.questions[0];
  ExamEngine.selectAnswerInSet(q0.id, "ก");
  assert(ExamEngine.userAnswers[q0.id] === "ก", "Answer must be recorded");

  // Jump to Computer (Question 41, index 40)
  ExamEngine.jumpTo(40);
  assert(ExamEngine.currentIndex === 40, "Should jump to question index 40");
  const q40 = ExamEngine.questions[40];
  assert(q40.subject_id === "04", "Question 41 must belong to Computer module 04");

  // Jump to English (Question 136, index 135)
  ExamEngine.jumpTo(135);
  assert(ExamEngine.currentIndex === 135, "Should jump to question index 135 (English)");
  const q135 = ExamEngine.questions[135];
  assert(q135.subject_id === "03", "Question 136 must belong to English module 03");
  console.log("  ✓ Answer selection, state persistence, and 150-question subject jumping verified.\n");

  // Test 7: Dual-Section Passing Criteria Evaluation
  console.log("Test 7: Testing Dual-Section Passing Criteria (Section A >= 24/40, Section B >= 66/110)");
  
  // Scenario A: Passing both sections (Section A: 25/40, Section B: 70/110 => Passed)
  const answersPass = {};
  ExamEngine.questions.forEach((q, idx) => {
    const qKey = `${q.subject_id}::${q.id}`;
    if (idx < 25) {
      // First 25 math/thai correct
      answersPass[qKey] = q.correct_answer;
      answersPass[q.id] = q.correct_answer;
    } else if (idx < 40) {
      answersPass[qKey] = "WRONG";
      answersPass[q.id] = "WRONG";
    } else if (idx < 40 + 70) {
      // 70 Section B correct
      answersPass[qKey] = q.correct_answer;
      answersPass[q.id] = q.correct_answer;
    } else {
      answersPass[qKey] = "WRONG";
      answersPass[q.id] = "WRONG";
    }
  });
  ExamEngine.userAnswers = answersPass;
  ExamEngine.submitActiveSet(false);

  let submitted = ExamEngine.activeSet;
  assert(submitted.isCompleted === true, "Set must be marked isCompleted");
  assert(submitted.sectionA.score === 25, `Section A score expected 25, got ${submitted.sectionA.score}`);
  assert(submitted.sectionA.passed === true || submitted.sectionA.isPassed === true, "Section A should be passed (25 >= 24)");
  assert(submitted.sectionB.score === 70, `Section B score expected 70, got ${submitted.sectionB.score}`);
  assert(submitted.sectionB.passed === true || submitted.sectionB.isPassed === true, "Section B should be passed (70 >= 66)");
  assert(submitted.passed === true || submitted.isPassed === true, "Overall should be passed when both sections pass");
  console.log("  ✓ Scenario 1: Section A = 25/40, Section B = 70/110 -> PASSED verified.");

  // Scenario B: Failed Section A (20/40), Passed Section B (100/110), Total 120/150 (80%) -> MUST FAIL!
  const answersFailA = {};
  ExamEngine.questions.forEach((q, idx) => {
    const qKey = `${q.subject_id}::${q.id}`;
    if (idx < 20) {
      answersFailA[qKey] = q.correct_answer;
      answersFailA[q.id] = q.correct_answer; // 20/40 (failed A)
    } else if (idx < 40) {
      answersFailA[qKey] = "WRONG";
      answersFailA[q.id] = "WRONG";
    } else if (idx < 40 + 100) {
      answersFailA[qKey] = q.correct_answer;
      answersFailA[q.id] = q.correct_answer; // 100/110 (passed B)
    } else {
      answersFailA[qKey] = "WRONG";
      answersFailA[q.id] = "WRONG";
    }
  });
  ExamEngine.userAnswers = answersFailA;
  ExamEngine.submitActiveSet(false);

  submitted = ExamEngine.activeSet;
  assert(submitted.sectionA.score === 20, "Section A score must be 20");
  assert(!submitted.sectionA.passed, "Section A must be marked NOT passed");
  assert(submitted.sectionB.passed === true, "Section B must be passed");
  assert(!submitted.passed, "Overall MUST FAIL if Section A < 24 even if total >= 90!");
  console.log("  ✓ Scenario 2: Section A = 20/40, Section B = 100/110 (Total 120/150) -> FAILED (Section A shortfall) verified.");

  // Scenario C: Passed Section A (40/40), Failed Section B (65/110), Total 105/150 (70%) -> MUST FAIL!
  const answersFailB = {};
  ExamEngine.questions.forEach((q, idx) => {
    const qKey = `${q.subject_id}::${q.id}`;
    if (idx < 40) {
      answersFailB[qKey] = q.correct_answer;
      answersFailB[q.id] = q.correct_answer; // 40/40 (passed A)
    } else if (idx < 40 + 65) {
      answersFailB[qKey] = q.correct_answer;
      answersFailB[q.id] = q.correct_answer; // 65/110 (failed B by 1 point!)
    } else {
      answersFailB[qKey] = "WRONG";
      answersFailB[q.id] = "WRONG";
    }
  });
  ExamEngine.userAnswers = answersFailB;
  ExamEngine.submitActiveSet(false);

  submitted = ExamEngine.activeSet;
  assert(submitted.sectionA.passed === true, "Section A must be passed");
  assert(submitted.sectionB.score === 65, "Section B score must be 65");
  assert(submitted.sectionB.passed === false, "Section B must be NOT passed (65 < 66)");
  assert(submitted.passed === false, "Overall MUST FAIL if Section B < 66!");
  console.log("  ✓ Scenario 3: Section A = 40/40, Section B = 65/110 (Total 105/150) -> FAILED (Section B shortfall by 1 point) verified.\n");

  // Test 8: Retake Mechanism (Reusing Exact Same 150 Questions)
  console.log("Test 8: Testing Retake Mechanism (Exact Same 150 Questions)");
  const savedQIds = [...submitted.questionIds];
  const dataForRetake = ExamEngine.getMockSetsData();
  const setForRetake = dataForRetake.sets.find(s => s.id === submitted.id);
  setForRetake.userAnswers = {};
  setForRetake.hasStarted = false;
  setForRetake.isCompleted = false;
  setForRetake.score = null;
  setForRetake.percentage = null;
  ExamEngine.saveMockSetsData(dataForRetake);
  await ExamEngine.openSet(setForRetake.id, true);

  assert(ExamEngine.activeSet.questionIds.every((id, i) => id === savedQIds[i]), "Retake MUST use the exact same 150 questions");
  assert(Object.keys(ExamEngine.userAnswers).length === 0, "Retake must reset user answers");
  console.log("  ✓ Retake reuses exact same 150 questions with clean answer state.\n");

  // Test 9: Zero Emojis Compliance
  console.log("Test 9: Testing Zero Emojis Compliance in exam-engine.js and ui.js");
  const engineCode = fs.readFileSync(path.join(ROOT_DIR, 'js/exam-engine.js'), 'utf8');
  const uiCode = fs.readFileSync(path.join(ROOT_DIR, 'js/ui.js'), 'utf8');
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  
  assert(!emojiRegex.test(engineCode), "exam-engine.js must NOT contain any emojis!");
  assert(!emojiRegex.test(uiCode), "ui.js must NOT contain any emojis!");
  console.log("  ✓ Zero emojis detected in exam-engine.js and ui.js (100% SVG Icons via Icons.*).\n");

  console.log("==================================================================");
  console.log("🎉 ALL 9 TESTS PASSED FLAWLESSLY FOR 150-QUESTION MOCK EXAMS! 🎉");
  console.log("==================================================================");
  ExamEngine.stopTimer();
  process.exit(0);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
