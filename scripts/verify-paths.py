#!/usr/bin/env python3
"""
Santarém Basket Clube - Relative Paths Integrity Verifier
Audits all HTML, CSS, JS, and JSON files to verify:
1. Zero root-relative asset references (/assets/, /components/, /data/, /wp-content/, /wp-includes/).
2. Zero root-relative internal navigation links (href="/...") in HTML and Web Components.
3. Every HTML file has the appropriate data-root attribute.
"""

import os
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SKIP_DIRS = {'.git', '.playwright-cli', 'node_modules', 'scripts', 'docs'}


def main():
    errors = []

    # 1. Check HTML files
    html_count = 0
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if not f.endswith('.html'):
                continue
            html_count += 1
            p = Path(root) / f
            rel = p.relative_to(ROOT_DIR)
            content = p.read_text(encoding='utf-8', errors='ignore')

            if '<html' in content.lower() and 'data-root="' not in content:
                errors.append(f"[HTML missing data-root] {rel}")

            # Check for root-relative href or src (excluding // protocol-relative)
            for m in re.finditer(r'\b(href|src)=([\'"])(/(?!/)[^\'"]*)\2', content, flags=re.IGNORECASE):
                errors.append(f"[HTML root-relative {m.group(1)}='{m.group(3)}'] {rel}")

    # 2. Check CSS files
    css_dir = ROOT_DIR / 'assets' / 'css'
    for css_file in css_dir.glob('*.css'):
        rel = css_file.relative_to(ROOT_DIR)
        content = css_file.read_text(encoding='utf-8', errors='ignore')
        for m in re.finditer(r'url\(\s*([\'"]?)(/(?!/)[^)\'"\s]+)\1\s*\)', content, flags=re.IGNORECASE):
            errors.append(f"[CSS root-relative url({m.group(2)})] {rel}")

    # 3. Check JS Web Components
    comp_dir = ROOT_DIR / 'components'
    for js_file in comp_dir.glob('*.js'):
        rel = js_file.relative_to(ROOT_DIR)
        content = js_file.read_text(encoding='utf-8', errors='ignore')
        for m in re.finditer(r'fetch\(\s*[\'"]/(?!/)' , content):
            errors.append(f"[JS root-relative fetch] {rel}")
        for m in re.finditer(r'\b(href|src)=[\'"]/(?!/)', content):
            errors.append(f"[JS hardcoded root-relative {m.group(1)}] {rel}")

    # 4. Check JSON Data files
    data_dir = ROOT_DIR / 'data'
    for json_file in data_dir.glob('*.json'):
        rel = json_file.relative_to(ROOT_DIR)
        content = json_file.read_text(encoding='utf-8', errors='ignore')
        for m in re.finditer(r'"/(assets|wp-content|wp-includes)/', content):
            errors.append(f"[JSON root-relative path {m.group(0)}] {rel}")

    if errors:
        print(f"❌ Verification found {len(errors)} issue(s):")
        for e in errors[:30]:
            print("  ", e)
        if len(errors) > 30:
            print(f"  ... and {len(errors) - 30} more.")
        sys.exit(1)
    else:
        print(f"✅ All {html_count} HTML files, CSS stylesheets, Web Components, and JSON data files passed relative path verification (0 issues).")


if __name__ == '__main__':
    main()
