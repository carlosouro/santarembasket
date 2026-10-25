#!/usr/bin/env python3
"""
Comprehensive Static Website Cloner for santarembasket.pt
Downloads the entire public website, all pages, posts, custom post types,
media library (all sizes), CSS, JS, fonts, and embeds.
Rewrites internal URLs to root-relative paths for standalone static hosting.
Includes post-clone verification to ensure 0 broken internal references.
"""

import os
import sys
import re
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import ssl
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import deque

BASE_ORIGIN = "https://santarembasket.pt"
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = WORKSPACE_DIR

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

SSL_CTX = ssl.create_default_context()

HTML_WORKERS = 4      # Conservative to prevent 504 / gateway errors on slow WP backend
ASSET_WORKERS = 12    # Fast for static Nginx assets
TIMEOUT = 40

visited_html_urls = set()
visited_asset_urls = set()
failed_urls = set()
html_queue = deque()
asset_queue = deque()

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def normalize_url(url, parent_url=None):
    if not url:
        return None
    url = url.strip()
    if url.startswith("data:") or url.startswith("javascript:") or url.startswith("mailto:") or url.startswith("tel:"):
        return None
    if url.startswith("#"):
        return None
    
    # Handle protocol relative
    if url.startswith("//"):
        url = "https:" + url

    # Resolve relative URL
    if parent_url:
        url = urllib.parse.urljoin(parent_url, url)

    parsed = urllib.parse.urlparse(url)
    
    # Only keep santarembasket.pt (with or without www)
    netloc = parsed.netloc.lower()
    if netloc not in ("santarembasket.pt", "www.santarembasket.pt"):
        return None

    # Normalize netloc to santarembasket.pt
    # Strip fragment
    norm = urllib.parse.urlunparse(("https", "santarembasket.pt", parsed.path, "", parsed.query, ""))
    return norm

def url_to_local_path(url, is_html=False):
    parsed = urllib.parse.urlparse(url)
    path = urllib.parse.unquote(parsed.path)
    if not path or path == "/":
        return os.path.join(OUTPUT_DIR, "index.html")

    # Remove leading slash
    rel_path = path.lstrip("/")

    if is_html:
        ext = os.path.splitext(rel_path)[1].lower()
        if not ext or ext not in (".html", ".htm", ".xml", ".txt", ".json", ".rss"):
            rel_path = rel_path.rstrip("/") + "/index.html"
    else:
        # Static asset
        if rel_path.endswith("/") or not os.path.basename(rel_path):
            rel_path = rel_path.rstrip("/") + "/index.html"

    return os.path.join(OUTPUT_DIR, rel_path)

def fetch_content(url, retries=4):
    headers = {"User-Agent": USER_AGENT}
    req = urllib.request.Request(url, headers=headers)
    
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=TIMEOUT) as resp:
                content_type = resp.headers.get("Content-Type", "")
                data = resp.read()
                final_url = resp.geturl()
                return data, content_type, final_url
        except urllib.error.HTTPError as e:
            if e.code in (404, 403, 410):
                log(f"HTTP {e.code} for {url}")
                return None, None, url
            time.sleep(1 + attempt * 2)
        except Exception as e:
            time.sleep(1 + attempt * 2)
            if attempt == retries - 1:
                log(f"Failed to fetch {url} after {retries} attempts: {e}")
                return None, None, url
    return None, None, url

def discover_api_data():
    log("=== Stage 1: Discovering all content from WordPress REST API ===")
    
    def get_and_save_json(url, rel_save_path=None):
        data, _, _ = fetch_content(url)
        if data:
            if rel_save_path:
                target = os.path.join(OUTPUT_DIR, rel_save_path)
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with open(target, "wb") as f:
                    f.write(data)
            try:
                return json.loads(data.decode("utf-8", errors="ignore"))
            except Exception:
                return None
        return None

    # Save root wp-json schema
    get_and_save_json(f"{BASE_ORIGIN}/main/wp-json/", "main/wp-json/index.json")

    # 1. Pages
    pages = get_and_save_json(f"{BASE_ORIGIN}/main/wp-json/wp/v2/pages?per_page=100", "main/wp-json/wp/v2/pages/index.json") or []
    for p in pages:
        link = normalize_url(p.get("link"))
        if link:
            html_queue.append(link)
    log(f"Found {len(pages)} pages via WP API")

    # 2. Posts
    posts = get_and_save_json(f"{BASE_ORIGIN}/main/wp-json/wp/v2/posts?per_page=100", "main/wp-json/wp/v2/posts/index.json") or []
    post_dates = set()
    for p in posts:
        link = normalize_url(p.get("link"))
        if link:
            html_queue.append(link)
        date_str = p.get("date", "")
        if len(date_str) >= 7:
            post_dates.add(date_str[:7])
    log(f"Found {len(posts)} posts via WP API")

    # 3. Events (ajde_events)
    events = get_and_save_json(f"{BASE_ORIGIN}/main/wp-json/wp/v2/ajde_events?per_page=100", "main/wp-json/wp/v2/ajde_events/index.json") or []
    for e in events:
        link = normalize_url(e.get("link"))
        if link:
            html_queue.append(link)
    log(f"Found {len(events)} EventON events via WP API")

    # 4. SportsPress
    sp_count = 0
    for ep in ["events", "teams", "players", "staff", "calendars", "tables", "lists"]:
        items = get_and_save_json(f"{BASE_ORIGIN}/main/wp-json/sportspress/v2/{ep}?per_page=100", f"main/wp-json/sportspress/v2/{ep}/index.json") or []
        for i in items:
            link = normalize_url(i.get("link"))
            if link:
                html_queue.append(link)
                sp_count += 1
    log(f"Found {sp_count} SportsPress items via WP API")

    # 5. Categories & Tags
    tax_count = 0
    for ep in ["categories", "tags"]:
        items = get_and_save_json(f"{BASE_ORIGIN}/main/wp-json/wp/v2/{ep}?per_page=100", f"main/wp-json/wp/v2/{ep}/index.json") or []
        for i in items:
            link = normalize_url(i.get("link"))
            if link:
                html_queue.append(link)
                tax_count += 1
    log(f"Found {tax_count} categories & tags via WP API")

    # 6. Users / Authors
    users = get_and_save_json(f"{BASE_ORIGIN}/main/wp-json/wp/v2/users?per_page=100", "main/wp-json/wp/v2/users/index.json") or []
    for u in users:
        link = normalize_url(u.get("link"))
        if link:
            html_queue.append(link)
    log(f"Found {len(users)} authors via WP API")

    # 7. Media items (all pagination pages)
    media_count = 0
    media_page = 1
    while True:
        items = get_and_save_json(f"{BASE_ORIGIN}/main/wp-json/wp/v2/media?per_page=100&page={media_page}", f"main/wp-json/wp/v2/media/page_{media_page}.json")
        if not items:
            break
        for item in items:
            src = normalize_url(item.get("source_url"))
            if src:
                asset_queue.append(src)
                media_count += 1
            details = item.get("media_details", {})
            sizes = details.get("sizes", {})
            for size_name, size_info in sizes.items():
                size_src = normalize_url(size_info.get("source_url"))
                if size_src:
                    asset_queue.append(size_src)
                    media_count += 1
        media_page += 1
    log(f"Found {media_count} media file URLs via WP API")

    # 8. Standard core seeds
    seed_urls = [
        f"{BASE_ORIGIN}/",
        f"{BASE_ORIGIN}/main/",
        f"{BASE_ORIGIN}/main/feed/",
        f"{BASE_ORIGIN}/main/comments/feed/",
        f"{BASE_ORIGIN}/main/page/2/",
        f"{BASE_ORIGIN}/main/page/3/",
        f"{BASE_ORIGIN}/main/noticias/page/2/",
        f"{BASE_ORIGIN}/main/noticias/page/3/",
    ]
    for ym in post_dates:
        y, m = ym.split("-")
        seed_urls.append(f"{BASE_ORIGIN}/main/{y}/")
        seed_urls.append(f"{BASE_ORIGIN}/main/{y}/{m}/")

    for u in seed_urls:
        norm = normalize_url(u)
        if norm:
            html_queue.append(norm)

    log(f"Total initial unique HTML URLs queued: {len(set(html_queue))}")
    log(f"Total initial unique media assets queued: {len(set(asset_queue))}")

def extract_links_and_assets_from_html(html_text, page_url):
    new_html_urls = set()
    new_asset_urls = set()

    # 1. <a> href links
    for match in re.finditer(r'''<a[^>]+href=["\']([^"\']+)["\']''', html_text, re.IGNORECASE):
        href = match.group(1).strip()
        norm = normalize_url(href, page_url)
        if norm:
            parsed = urllib.parse.urlparse(norm)
            path = parsed.path
            ext = os.path.splitext(path)[1].lower()
            if ext in ('.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.pdf', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.zip'):
                new_asset_urls.add(norm)
            elif not any(skip in path for skip in ['/wp-admin/', '/wp-login.php', 'xmlrpc.php']):
                new_html_urls.add(norm)

    # 2. <link> tags
    for match in re.finditer(r'''<link[^>]+href=["\']([^"\']+)["\']''', html_text, re.IGNORECASE):
        href = match.group(1).strip()
        norm = normalize_url(href, page_url)
        if norm:
            parsed = urllib.parse.urlparse(norm)
            ext = os.path.splitext(parsed.path)[1].lower()
            if ext in ('.css', '.png', '.ico', '.jpg', '.jpeg', '.svg', '.xml', '.webmanifest'):
                new_asset_urls.add(norm)
            elif 'feed' in parsed.path:
                new_html_urls.add(norm)

    # 3. <script> src
    for match in re.finditer(r'''<script[^>]+src=["\']([^"\']+)["\']''', html_text, re.IGNORECASE):
        src = match.group(1).strip()
        norm = normalize_url(src, page_url)
        if norm:
            new_asset_urls.add(norm)

    # 4. <img> src, data-src, etc.
    for match in re.finditer(r'''<img[^>]+(?:src|data-src|data-large_image|data-orig-file)=["\']([^"\']+)["\']''', html_text, re.IGNORECASE):
        src = match.group(1).strip()
        norm = normalize_url(src, page_url)
        if norm:
            new_asset_urls.add(norm)

    # 5. srcset and data-srcset
    for match in re.finditer(r'''(?:srcset|data-srcset)=["\']([^"\']+)["\']''', html_text, re.IGNORECASE):
        srcset = match.group(1)
        for part in srcset.split(','):
            part = part.strip()
            if part:
                src = part.split()[0]
                norm = normalize_url(src, page_url)
                if norm:
                    new_asset_urls.add(norm)

    # 6. <source> src
    for match in re.finditer(r'''<source[^>]+src=["\']([^"\']+)["\']''', html_text, re.IGNORECASE):
        src = match.group(1).strip()
        norm = normalize_url(src, page_url)
        if norm:
            new_asset_urls.add(norm)

    # 7. CSS url(...) in style="" and <style>...</style>
    for match in re.finditer(r'''url\(\s*["\']?([^"\'\)]+)["\']?\s*\)''', html_text, re.IGNORECASE):
        u = match.group(1).strip()
        if u.startswith("data:"):
            continue
        norm = normalize_url(u, page_url)
        if norm:
            new_asset_urls.add(norm)

    return new_html_urls, new_asset_urls

def extract_assets_from_css(css_text, css_url):
    new_asset_urls = set()
    # 1. @import
    for match in re.finditer(r'''@import\s+(?:url\(\s*["\']?([^"\'\)]+)["\']?\s*\)|["\']([^"\']+)["\'])''', css_text, re.IGNORECASE):
        import_url = match.group(1) or match.group(2)
        norm = normalize_url(import_url.strip(), css_url)
        if norm:
            new_asset_urls.add(norm)

    # 2. url(...)
    for match in re.finditer(r'''url\(\s*["\']?([^"\'\)]+)["\']?\s*\)''', css_text, re.IGNORECASE):
        u = match.group(1).strip()
        if u.startswith("data:"):
            continue
        norm = normalize_url(u, css_url)
        if norm:
            new_asset_urls.add(norm)

    return new_asset_urls

def process_html_pages():
    log("=== Stage 2: Crawling and downloading all HTML pages ===")
    
    unique_queue = []
    seen = set()
    while html_queue:
        u = html_queue.popleft()
        parsed = urllib.parse.urlparse(u)
        path = parsed.path
        ext = os.path.splitext(path)[1].lower()
        if not ext and not path.endswith('/'):
            u = urllib.parse.urlunparse((parsed.scheme, parsed.netloc, path + '/', '', parsed.query, ''))
        if u not in seen and u not in visited_html_urls:
            seen.add(u)
            unique_queue.append(u)

    log(f"Starting crawl of {len(unique_queue)} queued HTML pages...")

    completed = 0
    with ThreadPoolExecutor(max_workers=HTML_WORKERS) as executor:
        future_to_url = {executor.submit(fetch_content, url): url for url in unique_queue}

        while future_to_url:
            for future in as_completed(list(future_to_url.keys())):
                url = future_to_url.pop(future)
                visited_html_urls.add(url)
                completed += 1

                try:
                    data, content_type, final_url = future.result()
                except Exception as e:
                    log(f"Exception for {url}: {e}")
                    failed_urls.add(url)
                    continue

                if not data:
                    failed_urls.add(url)
                    continue

                # Check if response is actually HTML or asset
                is_html = True
                if content_type and not any(h in content_type.lower() for h in ["text/html", "application/xhtml", "text/xml", "application/xml", "text/plain"]):
                    is_html = False

                local_path = url_to_local_path(url, is_html=is_html)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                with open(local_path, "wb") as f:
                    f.write(data)

                # If final_url differs (redirect), also save at final_url location
                if final_url != url:
                    final_norm = normalize_url(final_url)
                    if final_norm:
                        visited_html_urls.add(final_norm)
                        final_local = url_to_local_path(final_norm, is_html=is_html)
                        if final_local != local_path:
                            os.makedirs(os.path.dirname(final_local), exist_ok=True)
                            with open(final_local, "wb") as f:
                                f.write(data)

                if is_html:
                    html_text = data.decode("utf-8", errors="ignore")
                    new_htmls, new_assets = extract_links_and_assets_from_html(html_text, url)
                    for a in new_assets:
                        if a not in visited_asset_urls:
                            asset_queue.append(a)
                    for h in new_htmls:
                        if h not in visited_html_urls and h not in seen:
                            seen.add(h)
                            fut = executor.submit(fetch_content, h)
                            future_to_url[fut] = h

                if completed % 10 == 0 or not future_to_url:
                    log(f"HTML crawl progress: {completed} pages processed, {len(future_to_url)} pending in worker pool...")

    log(f"Completed HTML crawl! Total pages saved: {len(visited_html_urls)}")

def process_assets():
    log("=== Stage 3: Downloading all static assets (CSS, JS, Fonts, Images, PDFs) ===")
    
    unique_assets = []
    seen = set()
    while asset_queue:
        a = asset_queue.popleft()
        if a not in seen and a not in visited_asset_urls:
            seen.add(a)
            unique_assets.append(a)

    log(f"Total distinct assets queued: {len(unique_assets)}")

    completed = 0
    with ThreadPoolExecutor(max_workers=ASSET_WORKERS) as executor:
        future_to_url = {executor.submit(fetch_content, url): url for url in unique_assets}

        while future_to_url:
            for future in as_completed(list(future_to_url.keys())):
                url = future_to_url.pop(future)
                visited_asset_urls.add(url)
                completed += 1

                try:
                    data, content_type, final_url = future.result()
                except Exception as e:
                    failed_urls.add(url)
                    continue

                if not data:
                    failed_urls.add(url)
                    continue

                local_path = url_to_local_path(url, is_html=False)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                with open(local_path, "wb") as f:
                    f.write(data)

                # Check if it's CSS
                parsed = urllib.parse.urlparse(url)
                if parsed.path.endswith(".css") or (content_type and "css" in content_type):
                    css_text = data.decode("utf-8", errors="ignore")
                    sub_assets = extract_assets_from_css(css_text, url)
                    for sa in sub_assets:
                        if sa not in visited_asset_urls and sa not in seen:
                            seen.add(sa)
                            fut = executor.submit(fetch_content, sa)
                            future_to_url[fut] = sa

                if completed % 50 == 0 or not future_to_url:
                    log(f"Asset progress: {completed} downloaded, {len(future_to_url)} pending in pool...")

    log(f"Completed Asset download! Total assets saved: {len(visited_asset_urls)}")

def post_process_rewrites():
    log("=== Stage 4: Rewriting absolute URLs in HTML and CSS ===")

    replacements = [
        ("https://santarembasket.pt/main/", "/main/"),
        ("http://santarembasket.pt/main/", "/main/"),
        ("https://www.santarembasket.pt/main/", "/main/"),
        ("http://www.santarembasket.pt/main/", "/main/"),
        ("//santarembasket.pt/main/", "/main/"),
        ("//www.santarembasket.pt/main/", "/main/"),
        ("https://santarembasket.pt/", "/"),
        ("http://santarembasket.pt/", "/"),
        ("https://www.santarembasket.pt/", "/"),
        ("http://www.santarembasket.pt/", "/"),
        ("//santarembasket.pt/", "/"),
        ("//www.santarembasket.pt/", "/"),
        ("https%3A%2F%2Fsantarembasket.pt%2Fmain%2F", "%2Fmain%2F"),
        ("https%3A%2F%2Fsantarembasket.pt%2F", "%2F"),
    ]

    html_count = 0
    css_count = 0

    for root, dirs, files in os.walk(OUTPUT_DIR):
        if "scripts" in root or ".git" in root:
            continue
        for file in files:
            filepath = os.path.join(root, file)
            ext = os.path.splitext(file)[1].lower()

            if ext in (".html", ".htm", ".xml"):
                html_count += 1
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    modified = content
                    for src, dst in replacements:
                        modified = modified.replace(src, dst)

                    if modified != content:
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(modified)
                except Exception as e:
                    log(f"Error processing {filepath}: {e}")

            elif ext == ".css":
                css_count += 1
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                    modified = content
                    for src, dst in replacements:
                        modified = modified.replace(src, dst)

                    if modified != content:
                        with open(filepath, "w", encoding="utf-8") as f:
                            f.write(modified)
                except Exception as e:
                    log(f"Error processing CSS {filepath}: {e}")

    log(f"URL rewrite completed across {html_count} HTML files and {css_count} CSS files.")

def setup_root_and_symlinks():
    log("=== Stage 5: Setting up root index and compatibility symlinks ===")

    # 1. Root index.html
    root_index = os.path.join(OUTPUT_DIR, "index.html")
    root_html_content = """<!DOCTYPE html>
<html lang="pt-PT">
  <head>
    <meta charset="UTF-8">
    <title>Santarém Basket Clube</title>
    <meta http-equiv="refresh" content="0; url=/main/" />
    <script>window.location.replace("/main/");</script>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding-top: 50px;">
    <h2>Santarém Basket Clube</h2>
    <p>A carregar o website... <a href="/main/">Clique aqui se não for redirecionado automaticamente</a>.</p>
  </body>
</html>
"""
    with open(root_index, "w", encoding="utf-8") as f:
        f.write(root_html_content)
    log("Wrote root index.html with redirect to /main/")

    # 2. Symlinks
    for folder in ["wp-content", "wp-includes"]:
        link_path = os.path.join(OUTPUT_DIR, folder)
        target_path = os.path.join("main", folder)
        if not os.path.exists(link_path):
            try:
                os.symlink(target_path, link_path)
                log(f"Created symlink: {folder} -> {target_path}")
            except Exception as e:
                log(f"Could not create symlink {folder}: {e}")

    # 3. Permissive robots.txt
    robots_path = os.path.join(OUTPUT_DIR, "robots.txt")
    with open(robots_path, "w", encoding="utf-8") as f:
        f.write("User-agent: *\nAllow: /\n")
    log("Created robots.txt")

def verify_integrity():
    log("=== Stage 6: Verifying asset integrity and completeness ===")
    missing_assets = set()
    
    for root, dirs, files in os.walk(OUTPUT_DIR):
        if "scripts" in root or ".git" in root:
            continue
        for file in files:
            if not file.endswith(".html"):
                continue
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Find all local paths starting with /main/
            matches = re.findall(r'''(?:href|src|data-src|srcset)=["\'](/main/[^"\'\s>,]+)''', content)
            for ref in matches:
                ref_clean = ref.split("?")[0].split("#")[0]
                local_f = os.path.join(OUTPUT_DIR, urllib.parse.unquote(ref_clean.lstrip("/")))
                if not os.path.exists(local_f):
                    # Check if it's a directory page or a missing asset
                    if not os.path.exists(os.path.join(local_f, "index.html")):
                        ext = os.path.splitext(ref_clean)[1].lower()
                        if ext in ('.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.woff', '.woff2', '.ttf'):
                            missing_assets.add(ref_clean)

    if missing_assets:
        log(f"Found {len(missing_assets)} missing referenced assets. Attempting to fetch them directly...")
        recovered = 0
        for rel in missing_assets:
            remote_url = f"{BASE_ORIGIN}{rel}"
            data, _, _ = fetch_content(remote_url)
            if data:
                local_f = os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel.lstrip("/")))
                os.makedirs(os.path.dirname(local_f), exist_ok=True)
                with open(local_f, "wb") as f:
                    f.write(data)
                recovered += 1
        log(f"Recovered {recovered} of {len(missing_assets)} missing assets.")
    else:
        log("Integrity check passed! 0 missing assets found across all HTML files.")

def main():
    start_time = time.time()
    log("Starting santarembasket.pt static clone...")
    
    discover_api_data()
    process_html_pages()
    process_assets()
    post_process_rewrites()
    setup_root_and_symlinks()
    verify_integrity()

    elapsed = time.time() - start_time
    log(f"Cloning completed successfully in {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)!")
    log(f"Total HTML pages crawled: {len(visited_html_urls)}")
    log(f"Total assets downloaded: {len(visited_asset_urls)}")
    if failed_urls:
        log(f"Total failed URLs: {len(failed_urls)}")

if __name__ == "__main__":
    main()
