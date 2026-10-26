#!/usr/bin/env python3
"""
Santarém Basket Clube - Idempotent Relative Paths Migration Tool
Converts all root-relative URLs (/assets/..., /components/..., /wp-content/..., /main/..., internal links)
across HTML, CSS, and JSON files into portable relative paths (./, ../, ../../).
"""

import os
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

SKIP_DIRS = {'.git', '.playwright-cli', 'node_modules', 'scripts', 'docs'}


def get_rel_prefix(file_path: Path) -> str:
    rel = file_path.relative_to(ROOT_DIR)
    depth = len(rel.parts) - 1
    return './' if depth == 0 else '../' * depth


def normalize_internal_target(raw_path: str, rel_prefix: str) -> str:
    """
    Converts a root-relative path starting with '/' (but not '//') to a relative path using rel_prefix.
    Also strips legacy '/main/' prefix if present.
    """
    if not raw_path.startswith('/') or raw_path.startswith('//'):
        return raw_path

    # Strip legacy /main/ prefix
    path = raw_path
    if path == '/main' or path == '/main/':
        path = '/'
    elif path.startswith('/main/'):
        path = '/' + path[len('/main/'):]

    if path == '/':
        return rel_prefix
    if path.startswith('/?'):
        return rel_prefix + path[1:]
    if path.startswith('/#'):
        return rel_prefix + path[1:]

    clean = path.lstrip('/')
    return f"{rel_prefix}{clean}"


def migrate_html_file(file_path: Path) -> bool:
    rel_prefix = get_rel_prefix(file_path)
    original = file_path.read_text(encoding='utf-8', errors='ignore')
    content = original

    # 1. Ensure <html ... data-root="..."> is set accurately
    def replace_html_tag(match):
        tag = match.group(0)
        if 'data-root=' in tag:
            tag = re.sub(r'data-root=(["\'])[^"\']*\1', f'data-root="{rel_prefix}"', tag)
        else:
            tag = tag[:-1] + f' data-root="{rel_prefix}">'
        return tag

    content = re.sub(r'<html\b[^>]*>', replace_html_tag, content, count=1, flags=re.IGNORECASE)

    # 2. Replace href="/..." and src="/..." and action="/..." and data-src="/..."
    def replace_attr(match):
        attr = match.group(1)
        quote = match.group(2)
        val = match.group(3)
        if val.startswith('//'):
            return match.group(0)
        new_val = normalize_internal_target(val, rel_prefix)
        return f'{attr}={quote}{new_val}{quote}'

    content = re.sub(
        r'\b(href|src|action|data-src|data-lazyload)=([\'"])(/[^\'"\s]*)\2',
        replace_attr,
        content,
        flags=re.IGNORECASE
    )

    # 3. Replace srcset="/..." entries
    def replace_srcset(match):
        quote = match.group(1)
        val = match.group(2)
        parts = val.split(',')
        new_parts = []
        for part in parts:
            stripped = part.strip()
            if not stripped:
                continue
            tokens = stripped.split(None, 1)
            url_token = tokens[0]
            if url_token.startswith('/') and not url_token.startswith('//'):
                url_token = normalize_internal_target(url_token, rel_prefix)
            new_parts.append(url_token + (' ' + tokens[1] if len(tokens) > 1 else ''))
        return f'srcset={quote}{", ".join(new_parts)}{quote}'

    content = re.sub(
        r'\bsrcset=([\'"])([^\'"]+)\1',
        replace_srcset,
        content,
        flags=re.IGNORECASE
    )

    # 4. Replace CSS url(/...) inside inline styles or <style> blocks
    def replace_inline_url(match):
        quote = match.group(1) or ''
        val = match.group(2)
        if val.startswith('//'):
            return match.group(0)
        new_val = normalize_internal_target(val, rel_prefix)
        return f'url({quote}{new_val}{quote})'

    content = re.sub(
        r'url\(\s*([\'"]?)(/[^)\'"\s]+)\1\s*\)',
        replace_inline_url,
        content,
        flags=re.IGNORECASE
    )

    # 5. Special cases in index.html & main/index.html
    if file_path.name == 'index.html' and file_path.parent == ROOT_DIR:
        content = content.replace("fetch('/', { cache: 'reload' })", "fetch('./', { cache: 'reload' })")

    if file_path.parent.name == 'main' and file_path.name == 'index.html':
        content = content.replace('content="0; url=/?ref=main"', f'content="0; url={rel_prefix}?ref=main"')
        content = content.replace('window.location.replace("/?ref=main")', f'window.location.replace("{rel_prefix}?ref=main")')

    if content != original:
        file_path.write_text(content, encoding='utf-8')
        return True
    return False


def migrate_css_files() -> int:
    changed = 0
    css_dir = ROOT_DIR / 'assets' / 'css'
    if not css_dir.exists():
        return 0

    for css_file in css_dir.glob('*.css'):
        original = css_file.read_text(encoding='utf-8', errors='ignore')
        content = original

        # 1. @import url('/assets/css/foo.css') -> @import url('./foo.css')
        content = re.sub(
            r"@import\s+url\(\s*(['\"]?)/assets/css/([^)'\"]+)\1\s*\)",
            r"@import url('./\2')",
            content
        )

        # 2. url("/main/wp-content/...") or url("/wp-content/...") or url("/wp-includes/...")
        # From assets/css/, project root is ../../
        def replace_css_url(match):
            quote = match.group(1) or ''
            val = match.group(2)
            if val.startswith('//'):
                return match.group(0)
            if val.startswith('/main/'):
                val = '/' + val[len('/main/'):]
            if val.startswith('/assets/css/'):
                return f"url({quote}./{val[len('/assets/css/'):]}{quote})"
            if val.startswith('/assets/'):
                return f"url({quote}../{val[len('/assets/'):]}{quote})"
            clean = val.lstrip('/')
            return f"url({quote}../../{clean}{quote})"

        content = re.sub(
            r'url\(\s*([\'"]?)(/[^)\'"\s]+)\1\s*\)',
            replace_css_url,
            content
        )

        if content != original:
            css_file.write_text(content, encoding='utf-8')
            changed += 1

    return changed


def migrate_json_files() -> int:
    changed = 0
    data_dir = ROOT_DIR / 'data'
    if not data_dir.exists():
        return 0

    for json_file in data_dir.glob('*.json'):
        original = json_file.read_text(encoding='utf-8', errors='ignore')
        # Replace "/assets/... with "assets/... and "/wp-content/... with "wp-content/...
        content = re.sub(r'"/(assets|wp-content|wp-includes)/', r'"\1/', original)
        if content != original:
            json_file.write_text(content, encoding='utf-8')
            changed += 1

    return changed


def main():
    html_changed = 0
    html_total = 0

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if f.endswith('.html'):
                html_total += 1
                p = Path(root) / f
                if migrate_html_file(p):
                    html_changed += 1

    css_changed = migrate_css_files()
    json_changed = migrate_json_files()

    print(f"Migration complete:")
    print(f"  - HTML files scanned: {html_total} (updated: {html_changed})")
    print(f"  - CSS files updated:  {css_changed}")
    print(f"  - JSON files updated: {json_changed}")


if __name__ == '__main__':
    main()
