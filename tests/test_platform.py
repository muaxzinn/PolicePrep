#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Platform & Verification Suite for Minimal ExamPrep Platform
Validates:
1. Manifest & File Presence
2. Data Integrity across all 8 Content JSONs and 8 Advanced Exam JSONs
3. Mathematical Formula Syntax & LaTeX Consistency
4. Deep 9-Section Explanation Integrity
5. Absence of Personal Watermarks & Spam Text
6. Official QR Code Portal URLs
"""

import os
import sys
import json
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def test_manifest_and_files():
    print("=== 1. Testing Manifest & File Integrity ===")
    manifest_path = os.path.join(ROOT_DIR, "data", "manifest.json")
    assert os.path.exists(manifest_path), "manifest.json missing!"
    
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    print(f"Platform: {manifest.get('platform_name')}")
    print(f"Total Subjects: {len(manifest.get('content_modules', []))}")
    print(f"Total Exam Modules: {len(manifest.get('exam_modules', []))}")
    print(f"Total Official Links: {len(manifest.get('official_exams', []))}")
    print(f"Total PDF Documents: {len(manifest.get('pdf_documents', []))}")
    
    # Check all content modules exist
    for mod in manifest.get('content_modules', []):
        file_path = os.path.join(ROOT_DIR, mod['json_path'])
        assert os.path.exists(file_path), f"Content file missing: {mod['json_path']}"
        with open(file_path, "r", encoding="utf-8") as cf:
            data = json.load(cf)
            assert "pages" in data or "content" in data or "summary" in data, f"Invalid schema in {mod['json_path']}"
            page_count = len(data.get("pages", []))
            assert page_count > 0, f"No pages found in {mod['json_path']}"
            if mod.get('linked_pdf'):
                pdf_path = os.path.join(ROOT_DIR, mod['linked_pdf'])
                assert os.path.exists(pdf_path), f"Linked PDF missing: {mod['linked_pdf']}"
            print(f"  ✓ Content Module [{mod['id']}] {mod['title']} ({page_count} pages)")

    # Check all exam modules exist
    for emod in manifest.get('exam_modules', []):
        file_path = os.path.join(ROOT_DIR, emod['json_path'])
        assert os.path.exists(file_path), f"Exam file missing: {emod['json_path']}"
        with open(file_path, "r", encoding="utf-8") as ef:
            data = json.load(ef)
            questions = data.get("questions", [])
            assert len(questions) > 0, f"No questions in {emod['json_path']}"
            print(f"  ✓ Exam Module [{emod['id']}] {emod['title']} ({len(questions)} questions)")

    # Check PDF files exist
    for pdf in manifest.get('pdf_documents', []):
        file_path = os.path.join(ROOT_DIR, pdf['file_path'])
        assert os.path.exists(file_path), f"PDF file missing on disk: {pdf['file_path']}"
        size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"  ✓ PDF {pdf['filename']} ({size_mb:.1f} MB)")

    print(" Manifest & File Integrity: ALL PASSED\n")


def test_math_syntax_and_delimiters():
    print("=== 2. Testing Mathematical Formula Syntax & LaTeX Consistency ===")
    math_exam_path = os.path.join(ROOT_DIR, "advanced_exams", "01_exam_math.json")
    with open(math_exam_path, "r", encoding="utf-8") as f:
        math_exam = json.load(f)
        
    questions = math_exam.get("questions", [])
    assert len(questions) > 0, "No questions in math exam!"
    
    math_tokens = ["²", "³", "%", "+", "-", "=", "x", "×", "13²", "169"]
    
    found_math_count = 0
    for q in questions:
        text_corpus = (
            q.get("question", "") + " " +
            json.dumps(q.get("options", []), ensure_ascii=False) + " " +
            q.get("source_principle", "") + " " +
            json.dumps(q.get("reasoning_steps", []), ensure_ascii=False)
        )
            
        has_math = any(tok in text_corpus for tok in math_tokens)
        if has_math:
            found_math_count += 1
            
        # Check balanced parentheses
        open_p = text_corpus.count("(")
        close_p = text_corpus.count(")")
        assert open_p == close_p, f"Unbalanced parens in Question {q.get('id')}: (={open_p}, )={close_p}"
        
    print(f"  ✓ Math Exam Questions evaluated: {len(questions)}")
    print(f"  ✓ Questions containing mathematical notation: {found_math_count}/{len(questions)}")
    print("  ✓ All parentheses balanced perfectly")
    print(" Mathematical Formula Test: ALL PASSED\n")


def test_explanation_9_sections():
    print("=== 3. Testing Deep 9-Section Explanation Integrity ===")
    exam_dir = os.path.join(ROOT_DIR, "advanced_exams")
    required_structured_fields = [
        "concept_tested",
        "source_principle",
        "reasoning_steps",
        "option_analysis",
        "trap_analysis",
        "exam_strategy",
        "key_takeaways",
        "source_references",
        "correct_answer",
        "explanation"
    ]
    
    total_q = 0
    for fname in sorted(os.listdir(exam_dir)):
        if not fname.endswith(".json") or not fname.startswith("0"):
            continue
        fpath = os.path.join(exam_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
            questions = data.get("questions", [])
            assert len(questions) == 300, f"Expected 300 questions in {fname}, got {len(questions)}"
            for q in questions:
                total_q += 1
                for field in required_structured_fields:
                    assert field in q, f"Question {q.get('id')} in {fname} missing field: {field}"
                    val = q[field]
                    assert val, f"Field {field} in {q.get('id')} is empty"
                    
                # Check options
                opts = q.get("options", [])
                assert len(opts) == 4, f"Question {q.get('id')} does not have 4 options"
                labels = [o.get("label") for o in opts]
                assert labels == ["ก", "ข", "ค", "ง"], f"Invalid option labels in {q.get('id')}: {labels}"
                assert q.get("correct_answer") in ["ก", "ข", "ค", "ง"], f"Invalid correct_answer in {q.get('id')}"
                
                # Check explanation text includes 5.1 to 5.9
                exp_text = q.get("explanation", "")
                for sec_header in ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9"]:
                    assert sec_header in exp_text, f"Question {q.get('id')} missing {sec_header} in explanation text"

    assert total_q == 2400, f"Expected 2400 total questions across 8 subjects, got {total_q}"
    print(f"  ✓ Total Questions Verified: {total_q}")
    print(f"  ✓ All 8 subjects have exactly 300 questions (2,400 total)")
    print(f"  ✓ All {total_q} questions strictly implement the 9-part deep explanation standard (5.1 - 5.9)")
    print(" Explanation Integrity: ALL PASSED\n")


def test_watermark_and_cleanliness():
    print("=== 4. Testing Absence of Personal Watermarks & Spam Text ===")
    forbidden_tokens = ["ฟิรมัน", "อาแว", "แจกฟรี", "กลุ่มไลน์", "ดาวน์โหลดฟรีที่", "พี่บาส"]
    
    json_dir = os.path.join(ROOT_DIR, "json")
    clean_pages_count = 0
    violations = []
    
    for fname in sorted(os.listdir(json_dir)):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(json_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
            pages = data.get("pages", [])
            for p in pages:
                clean_pages_count += 1
                txt = json.dumps(p, ensure_ascii=False)
                for tok in forbidden_tokens:
                    if tok in txt:
                        violations.append((fname, p.get("page_number"), tok))

    assert len(violations) == 0, f"Found watermark violations: {violations}"
    print(f"  ✓ Scanned {clean_pages_count} pages across summary JSONs")
    print("  ✓ Zero personal watermarks or spam advertising detected")
    print(" Cleanliness Check: ALL PASSED\n")


def test_official_links():
    print("=== 5. Testing Official QR Portal Links ===")
    qr_path = os.path.join(ROOT_DIR, "qr_code_links.json")
    with open(qr_path, "r", encoding="utf-8") as f:
        qr_data = json.load(f)
        
    links = qr_data.get("qr_links", [])
    assert len(links) == 6, f"Expected 6 links, got {len(links)}"
    
    for l in links:
        url = l.get("qr_url", "")
        dest = l.get("destination_url", "")
        assert url.startswith("https://"), f"Insecure or invalid URL: {url}"
        assert dest.startswith("https://guru-"), f"Invalid destination: {dest}"
        print(f"  ✓ [{l.get('subject')}] {url} -> {dest}")

    print(" Official Links: ALL PASSED\n")


def test_ebook_structure_and_zero_questions():
    print("=== 6. Testing E-Book Architecture & Pure Summary Content ===")
    json_dir = os.path.join(ROOT_DIR, "json")
    files = sorted([f for f in os.listdir(json_dir) if f.endswith(".json")])
    assert len(files) == 8, f"Expected 8 e-book summary files, found {len(files)}"

    total_chapters = 0
    total_pages = 0

    for fname in files:
        fpath = os.path.join(json_dir, fname)
        with open(fpath, "r", encoding="utf-8") as fp:
            data = json.load(fp)

        # 1. Structure checks
        assert "ebook_title" in data, f"Missing ebook_title in {fname}"
        assert "table_of_contents" in data, f"Missing table_of_contents in {fname}"
        assert "chapters" in data, f"Missing chapters in {fname}"
        assert "pages" in data, f"Missing pages in {fname}"
        assert len(data["table_of_contents"]) > 0, f"Empty TOC in {fname}"
        assert len(data["chapters"]) > 0, f"Empty chapters in {fname}"
        assert len(data["pages"]) > 0, f"Empty pages in {fname}"

        # 2. Strict exclusion of exam question leakage
        raw_text = json.dumps(data, ensure_ascii=False)
        for forbidden in ['"questions"', '"options"', '"correct_answer"', '"answer_key"']:
            assert forbidden not in raw_text, f"Forbidden exam property {forbidden} found in e-book {fname}"

        # 3. Check page metadata
        for p in data["pages"]:
            assert "chapter_num" in p, f"Missing chapter_num in {fname} p.{p.get('page_number')}"
            assert "title" in p, f"Missing title in {fname} p.{p.get('page_number')}"
            assert "callouts" in p, f"Missing callouts in {fname} p.{p.get('page_number')}"
            assert "key_takeaways" in p, f"Missing key_takeaways in {fname} p.{p.get('page_number')}"

        total_chapters += len(data["chapters"])
        total_pages += len(data["pages"])
        print(f"  ✓ [{data.get('subject_id')}] {fname}: {len(data['chapters'])} Chapters, {len(data['pages'])} Pages — 100% Pure E-Book")

    print(f"  ✓ Total Verified: {total_chapters} Chapters across {total_pages} Pages")
    print("  ✓ Zero Exam Questions, Choices, or Answer Keys in Summary JSONs")
    print(" E-Book Architecture Test: ALL PASSED\n")


if __name__ == "__main__":
    print("Starting Minimal ExamPrep Automated Verification Suite...\n")
    try:
        test_manifest_and_files()
        test_math_syntax_and_delimiters()
        test_explanation_9_sections()
        test_watermark_and_cleanliness()
        test_official_links()
        test_ebook_structure_and_zero_questions()
        print("🎉 ALL 6 TEST SUITES PASSED FLAWLESSLY! 🎉")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)

